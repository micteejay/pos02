
## Multi-Tenancy Implementation Plan

### Phase 1: Database Migration
Add `company_id` column (UUID, FK to company_profiles) to these tables:
- `profiles` (already has no company link — add it)
- `stores`, `warehouses`, `departments`
- `inventory_items`, `inventory_categories`
- `sales_transactions`, `invoices`
- `purchase_orders`, `suppliers`
- `expenses`, `categories`
- `documents`, `document_folders`
- `chat_channels`
- `approvals`, `workflows`, `workflow_templates`
- `receipt_templates`, `saved_reports`, `generated_reports`
- `app_settings` (already keyed, but should be company-scoped)
- `notifications`, `audit_log`

Migrate all existing rows to use the first company_profiles.id.

### Phase 2: RLS Policy Updates
Replace existing RLS policies with company-scoped versions using a helper function:
```sql
get_user_company_id(user_id) → returns company_id from profiles
```
All SELECT/INSERT/UPDATE/DELETE policies will check `company_id = get_user_company_id(auth.uid())`.

### Phase 3: Frontend Updates
- Update `use-app-settings` to scope settings by company
- Update `use-shared-data` to include company_id in all queries/inserts
- Update `handle_new_user` trigger to set company_id on profile
- Update `create-user` edge function to set company_id on new staff
- Update company setup flow to set company_id on the creator's profile

### Phase 4: Onboarding Flow
- When a new user signs up and creates a company, their profile gets that company_id
- Staff created via admin panel inherit the admin's company_id
- All subsequent data created by that user is tagged with their company_id

### Key Principle
- `company_id` is set on the `profiles` table
- A security-definer function `get_user_company_id()` reads it
- All RLS policies reference this function for isolation
