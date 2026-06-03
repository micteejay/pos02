# Implementation Plan

Five connected workstreams. I'll ship them in this order so each builds on the last.

---

## 1. Roles & Permissions — wire RBAC into UI

The DB already has `roles`, `user_roles`, `has_role`, `has_any_role`, `has_permission`, `get_user_permissions`. The UI mostly doesn't gate on them.

- Add `usePermissions()` hook (loads `get_user_permissions` once per session, cached in `use-auth`).
- Add `<Can permission="...">` wrapper + `can(perm)` helper.
- Gate destructive/admin actions across pages:
  - Users/Roles: only `super_admin`/`admin` see create/edit/delete.
  - Inventory: gate Add/Edit/Delete/Adjust by `inventory.write`.
  - POS: cashier-only actions vs manager overrides (discount > X, credit sales).
  - Approvals: only roles in workflow step can Approve/Reject (already enforced by `can_approve_step`, mirror in UI).
  - Settings/Org/Workflows: admin-only.
- Seed a sensible default permission list on existing system roles via migration (idempotent UPDATE).

## 2. Customer payments & loyalty

New tables:
- `customer_payments` — `customer_id, amount, method, reference, sale_id?, note, created_by, company_id, created_at`. RLS: company scoped.
- `loyalty_transactions` — `customer_id, points, type ('earn'|'redeem'|'adjust'), reference_type, reference_id, note, created_by, company_id`.
- Add columns to `customers`: `outstanding_balance numeric default 0`, `loyalty_points integer default 0`.

Settings (in `app_settings`):
- `loyalty.earn_rate` (points per currency unit, e.g. 1 pt / ₦100)
- `loyalty.redeem_value` (currency per point, e.g. ₦1 / 10 pts)
- `loyalty.enabled` bool

Triggers/functions:
- On `sales_transactions` completed: if `customer_id` not null → award points based on `total` × earn_rate; insert `loyalty_transactions` row; increment `customers.loyalty_points`.
- If sale `amount_tendered < total` and customer set → record outstanding balance delta; increment `customers.outstanding_balance`.
- On `customer_payments` insert: decrement `outstanding_balance`, log audit.

UI:
- Customer detail drawer (CustomersPage): tabs **Overview / Payments / Loyalty / Sales History**.
- "Record Payment" dialog (amount, method, reference, note).
- Loyalty card showing points balance + recent earn/redeem.

## 3. POS — split payments + partial/credit sales

POSPage payment flow becomes a **PaymentDialog**:
- Multiple payment lines, each `{ method: cash|transfer|card|mobile, amount, reference? }`.
- Live "Paid / Total / Balance / Change" panel.
- If `paid < total` AND customer is selected (not Walk-in) AND user has `credit_sales` perm → allow "Complete with balance owed".
- If `paid > total` and any cash line exists → change goes to cash.
- Persist breakdown in `sales_transactions.notes` JSON (or new `payments jsonb` column — I'll add a column).

Schema additions:
- `sales_transactions.payments jsonb default '[]'` — array of `{method, amount, reference}`.
- `sales_transactions.balance_due numeric default 0`.

## 4. Purchase Orders — create inventory on the fly + correct price

In the new-PO line editor:
- Item picker shows existing inventory; if no match, surface **"+ Create new item"** which opens a mini inventory form (name, SKU auto, unit, category, cost_price prefilled, optional selling price).
- On save: insert into `inventory_items` with `qty=0`, attach to the PO line.
- The PO line "Unit price" field is **cost price** (purchase price), not selling price — relabel + prefill from `inventory_items.cost_price`. Selling price stays untouched on the item.

## 5. Receipt printout — clean left-aligned layout

`src/lib/receipt-text.ts` and `ReceiptTemplate.tsx`:
- Replace current right-aligned amount layout with a **two-line per item** block on narrow widths (58mm = 32 cols):
  ```text
  Item name (truncated to width)
    3 x 1,500.00            4,500.00
  ```
  On 80mm/A4 keep a single line with proper columns: `Name | Qty | Price | Total` with fixed left-aligned column widths.
- Use column widths driven by paper width; never overflow.
- Wrap long item names (word-wrap) rather than truncate when possible.
- Fix typo `"goods  quntity rate" / "amonut"` header → proper labels.
- Same cleanup applied to on-screen `ReceiptTemplate` preview so what-you-see matches what prints.

---

## Migrations summary

1. `customer_payments`, `loyalty_transactions` tables + GRANTs + RLS.
2. `customers`: add `outstanding_balance`, `loyalty_points`.
3. `sales_transactions`: add `payments jsonb`, `balance_due numeric`.
4. Loyalty + balance triggers on `sales_transactions`.
5. `app_settings` seed for loyalty config (per company, on first use).
6. Default permissions backfill on system roles.

## Technical notes

- All new tables: `company_id` + `company_all` RLS using `get_user_company_id(auth.uid())`, plus explicit `GRANT`s for `authenticated`/`service_role`.
- Permissions cached on `useAuth` — invalidated on role change via realtime on `user_roles`.
- POS PaymentDialog is a new component to keep `POSPage.tsx` lean.
- Receipt layout changes are presentation-only; no schema impact beyond the new `payments`/`balance_due` columns.

Approve to proceed and I'll start with the migrations, then ship workstreams 1→5.