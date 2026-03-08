

# Plan: Add RLS to company_profiles + Connect All Frontend Pages to Backend

## Summary

The core data hooks (`use-shared-data`, `use-app-settings`, `use-app-events`, `use-audit`) are already connected to the backend. However, several pages still use local `useState` with empty arrays instead of reading/writing from the database. This plan addresses:

1. **RLS policies for `company_profiles`** table
2. **Supply Chain page** -- POs and suppliers use local state, not the `purchase_orders` / `suppliers` tables
3. **Chat page** -- channels and messages use local state, not `chat_channels` / `chat_messages` tables
4. **Workflows page** -- uses local state, no backend table (needs decision)

## Database Changes

### 1. Add RLS policies to `company_profiles`

```sql
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all" ON public.company_profiles
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "auth_read" ON public.company_profiles
  FOR SELECT TO authenticated
  USING (true);
```

The owner can do all operations; all authenticated users can read (needed for branding/company info across the app).

## Frontend Changes

### 2. SupplyPage.tsx -- Connect POs and Suppliers to backend

Currently uses `useState(initialOrders)` and `useState(initialSuppliers)` with empty arrays. Will refactor to:

- Fetch `purchase_orders` (with `purchase_order_items`) and `suppliers` from database on mount
- Replace `setOrders` / `setSuppliers` local mutations with database operations
- `updateOrderStatus` will update via `supabase.from("purchase_orders").update(...)`
- `deleteOrder` / `deleteSupplier` will use database deletes
- New PO creation will insert into `purchase_orders` + `purchase_order_items`
- New supplier creation will insert into `suppliers`

### 3. ChatPage.tsx -- Connect channels and messages to backend

Currently uses `useState(initialChannels)` and `useState(initialMessages)`. Will refactor to:

- Fetch `chat_channels` and `chat_channel_members` on mount
- Fetch `chat_messages` for active channel
- Send messages via `supabase.from("chat_messages").insert(...)`
- Subscribe to realtime message inserts for live chat
- Create channels via `chat_channels` insert + member join

### 4. WorkflowsPage.tsx -- Connect to backend

Currently uses local state with no DB table. Two options:
- Use the existing `approvals` table for workflow tracking (since workflows feed into approvals)
- Keep as local state for now (workflows are essentially approval pipelines)

I'll keep workflows as local state since the approvals system already handles the database persistence. The workflow UI is a visualization layer on top of approvals.

## Files to Edit

| File | Change |
|------|--------|
| Migration SQL | Add RLS to `company_profiles` |
| `src/pages/SupplyPage.tsx` | Fetch/mutate POs and suppliers from DB |
| `src/pages/ChatPage.tsx` | Fetch/mutate channels and messages from DB with realtime |

## Scope

This covers the three main disconnected pages. The following pages are already connected via the shared data hooks:
- Dashboard, Inventory, Sales, POS, Reports, Documents, Organization, Users, Settings, Approvals, Notifications, Audit Log -- all use `useSharedData()`, `useAppSettings()`, `useAppEvents()` which already read/write from the database.

