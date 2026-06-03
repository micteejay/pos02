# Database Tables Summary

This document lists all **35 tables** defined in the project database schema (`database.sql`), along with their columns, types, and primary/foreign keys.

---

## 1. Organization & Core
### `stores`
Stores physical retail store locations.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `name` (TEXT, NOT NULL)
- `type` (TEXT, Default: 'Retail')
- `address` (TEXT)
- `phone` (TEXT)
- `email` (TEXT)
- `status` (store_status enum, Default: 'active')
- `manager_id` (UUID, Foreign Key -> profiles.id)
- `created_at` (TIMESTAMPTZ, Default: now())
- `updated_at` (TIMESTAMPTZ, Default: now())

### `warehouses`
Warehouses for storage and inventory tracking.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `name` (TEXT, NOT NULL)
- `location` (TEXT)
- `capacity` (INTEGER, Default: 0)
- `sqft` (TEXT)
- `manager_id` (UUID, Foreign Key -> profiles.id)
- `zones` (INTEGER, Default: 1)
- `status` (warehouse_status enum, Default: 'operational')
- `created_at` (TIMESTAMPTZ, Default: now())
- `updated_at` (TIMESTAMPTZ, Default: now())

### `departments`
Company departments.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `name` (TEXT, NOT NULL)
- `head_id` (UUID, Foreign Key -> profiles.id)
- `budget` (NUMERIC(14,2), Default: 0)
- `teams` (TEXT[], Default: '{}')
- `created_at` (TIMESTAMPTZ, Default: now())
- `updated_at` (TIMESTAMPTZ, Default: now())

### `company_profiles`
Details and settings for the organization/tenant company.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `owner_id` (UUID, Foreign Key -> auth.users.id)
- `name` (TEXT, NOT NULL)
- `address` (TEXT)
- `city` (TEXT)
- `state` (TEXT)
- `country` (TEXT, Default: 'Nigeria')
- `phone` (TEXT)
- `email` (TEXT)
- `website` (TEXT)
- `tax_id` (TEXT)
- `industry` (TEXT, Default: 'Retail')
- `currency` (TEXT, Default: 'NGN')
- `tax_rate` (NUMERIC(5,2), Default: 7.5)
- `business_type` (TEXT, Default: 'Limited Company')
- `logo_url` (TEXT)
- `rc_number` (TEXT)
- `created_at` (TIMESTAMPTZ, Default: now())
- `updated_at` (TIMESTAMPTZ, Default: now())

---

## 2. Users, Roles & RBAC
### `roles`
System roles governing access and permissions.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `name` (TEXT, NOT NULL, UNIQUE)
- `description` (TEXT)
- `permissions` (TEXT[], Default: '{}')
- `is_system` (BOOLEAN, Default: FALSE)
- `color` (TEXT, Default: 'bg-muted text-muted-foreground')
- `created_at` (TIMESTAMPTZ, Default: now())
- `updated_at` (TIMESTAMPTZ, Default: now())

### `profiles`
User profiles referencing auth.users.
- `id` (UUID, Primary Key, Foreign Key -> auth.users.id)
- `name` (TEXT)
- `email` (TEXT)
- `avatar` (TEXT)
- `status` (user_status enum, Default: 'active')
- `department_id` (UUID, Foreign Key -> departments.id)
- `store_id` (UUID, Foreign Key -> stores.id)
- `last_active` (TIMESTAMPTZ, Default: now())
- `created_at` (TIMESTAMPTZ, Default: now())
- `updated_at` (TIMESTAMPTZ, Default: now())

### `user_roles`
Mapping table assigning roles to users.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `user_id` (UUID, Foreign Key -> auth.users.id, UNIQUE with role_id)
- `role_id` (UUID, Foreign Key -> roles.id, UNIQUE with user_id)

---

## 3. Inventory Management
### `inventory_categories`
Categories for inventory grouping.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `name` (TEXT, NOT NULL, UNIQUE)
- `description` (TEXT)
- `parent_id` (UUID, Foreign Key -> inventory_categories.id)
- `created_at` (TIMESTAMPTZ, Default: now())

### `inventory_items`
List of all products and materials with stock levels.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `sku` (TEXT, NOT NULL, UNIQUE)
- `name` (TEXT, NOT NULL)
- `description` (TEXT)
- `category_id` (UUID, Foreign Key -> inventory_categories.id)
- `category` (TEXT, Default: 'Uncategorized')
- `warehouse_id` (UUID, Foreign Key -> warehouses.id)
- `qty` (INTEGER, Default: 0)
- `reorder_point` (INTEGER, Default: 50)
- `cost_price` (NUMERIC(12,2), Default: 0)
- `price` (NUMERIC(12,2), Default: 0)
- `unit` (TEXT, Default: 'pcs')
- `barcode` (TEXT)
- `image_url` (TEXT)
- `status` (inventory_status enum, Default: 'ok')
- `created_at` (TIMESTAMPTZ, Default: now())
- `updated_at` (TIMESTAMPTZ, Default: now())

### `stock_adjustments`
Log of stock changes (manual adjustments, POs, sales, transfers, damages).
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `inventory_item_id` (UUID, Foreign Key -> inventory_items.id)
- `adjustment_type` (TEXT, NOT NULL)
- `qty_before` (INTEGER, NOT NULL)
- `qty_change` (INTEGER, NOT NULL)
- `qty_after` (INTEGER, NOT NULL)
- `reason` (TEXT)
- `reference_id` (TEXT)
- `reference_type` (TEXT)
- `adjusted_by` (UUID, Foreign Key -> auth.users.id)
- `created_at` (TIMESTAMPTZ, Default: now())

### `stock_transfers`
Inter-warehouse inventory transfer orders.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `transfer_number` (TEXT, NOT NULL, UNIQUE)
- `from_warehouse_id` (UUID, Foreign Key -> warehouses.id)
- `to_warehouse_id` (UUID, Foreign Key -> warehouses.id)
- `status` (transfer_status enum, Default: 'pending')
- `notes` (TEXT)
- `requester` (UUID, Foreign Key -> auth.users.id)
- `approved_by` (UUID, Foreign Key -> auth.users.id)
- `eta` (DATE)
- `created_at` (TIMESTAMPTZ, Default: now())
- `updated_at` (TIMESTAMPTZ, Default: now())

### `stock_transfer_items`
Individual items included in a stock transfer.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `transfer_id` (UUID, Foreign Key -> stock_transfers.id)
- `inventory_item_id` (UUID, Foreign Key -> inventory_items.id)
- `name` (TEXT, NOT NULL)
- `sku` (TEXT)
- `qty` (INTEGER, Default: 1)

---

## 4. Supply Chain & Purchasing
### `suppliers`
Suppliers profile and performance tracking.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `name` (TEXT, NOT NULL)
- `contact_name` (TEXT)
- `email` (TEXT)
- `phone` (TEXT)
- `address` (TEXT)
- `categories` (TEXT[], Default: '{}')
- `status` (supplier_status enum, Default: 'active')
- `rating` (NUMERIC(2,1), Default: 0)
- `on_time_rate` (INTEGER, Default: 0)
- `total_orders` (INTEGER, Default: 0)
- `notes` (TEXT)
- `created_at` (TIMESTAMPTZ, Default: now())
- `updated_at` (TIMESTAMPTZ, Default: now())

### `purchase_orders`
Purchase Orders sent to suppliers to buy stock.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `po_number` (TEXT, NOT NULL, UNIQUE)
- `supplier_id` (UUID, Foreign Key -> suppliers.id)
- `warehouse_id` (UUID, Foreign Key -> warehouses.id)
- `status` (po_status enum, Default: 'draft')
- `subtotal` (NUMERIC(12,2), Default: 0)
- `tax` (NUMERIC(12,2), Default: 0)
- `shipping` (NUMERIC(12,2), Default: 0)
- `total` (NUMERIC(12,2), Default: 0)
- `notes` (TEXT)
- `expected_date` (DATE)
- `received_date` (DATE)
- `created_by` (UUID, Foreign Key -> auth.users.id)
- `approved_by` (UUID, Foreign Key -> auth.users.id)
- `created_at` (TIMESTAMPTZ, Default: now())
- `updated_at` (TIMESTAMPTZ, Default: now())

### `purchase_order_items`
Individual items and quantities in a purchase order.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `purchase_order_id` (UUID, Foreign Key -> purchase_orders.id)
- `inventory_item_id` (UUID, Foreign Key -> inventory_items.id)
- `name` (TEXT, NOT NULL)
- `sku` (TEXT)
- `qty` (INTEGER, Default: 1)
- `received_qty` (INTEGER, Default: 0)
- `unit_price` (NUMERIC(12,2), Default: 0)
- `total` (NUMERIC(12,2), Default: 0)

---

## 5. Sales & POS (Point of Sale)
### `sales_transactions`
Checkout and checkout logs from the point of sale.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `transaction_number` (TEXT, NOT NULL, UNIQUE)
- `customer_name` (TEXT, Default: 'Walk-in')
- `customer_email` (TEXT)
- `customer_phone` (TEXT)
- `subtotal` (NUMERIC(12,2), Default: 0)
- `tax` (NUMERIC(12,2), Default: 0)
- `discount` (NUMERIC(12,2), Default: 0)
- `discount_percent` (NUMERIC(5,2), Default: 0)
- `total` (NUMERIC(12,2), Default: 0)
- `payment_method` (TEXT, Default: 'cash')
- `amount_tendered` (NUMERIC(12,2), Default: 0)
- `change_given` (NUMERIC(12,2), Default: 0)
- `store_id` (UUID, Foreign Key -> stores.id)
- `cashier_id` (UUID, Foreign Key -> auth.users.id)
- `status` (transaction_status enum, Default: 'completed')
- `notes` (TEXT)
- `receipt_number` (TEXT)
- `created_at` (TIMESTAMPTZ, Default: now())

### `sales_transaction_items`
Items purchased during a checkout transaction.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `transaction_id` (UUID, Foreign Key -> sales_transactions.id)
- `inventory_item_id` (UUID, Foreign Key -> inventory_items.id)
- `name` (TEXT, NOT NULL)
- `sku` (TEXT)
- `qty` (INTEGER, Default: 1)
- `price` (NUMERIC(12,2), Default: 0)
- `discount` (NUMERIC(12,2), Default: 0)
- `total` (NUMERIC(12,2), Default: 0)

### `sales_returns`
Sales returns processed for refunds.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `transaction_id` (UUID, Foreign Key -> sales_transactions.id)
- `reason` (TEXT)
- `refund_amount` (NUMERIC(12,2), Default: 0)
- `refund_method` (TEXT, Default: 'original')
- `processed_by` (UUID, Foreign Key -> auth.users.id)
- `created_at` (TIMESTAMPTZ, Default: now())

### `sales_return_items`
Items returned during a refund transaction.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `return_id` (UUID, Foreign Key -> sales_returns.id)
- `inventory_item_id` (UUID, Foreign Key -> inventory_items.id)
- `name` (TEXT, NOT NULL)
- `qty` (INTEGER, Default: 1)
- `price` (NUMERIC(12,2), Default: 0)
- `restock` (BOOLEAN, Default: TRUE)

---

## 6. Workflows & Approvals
### `workflow_templates`
Pre-defined workflow stages for orders, expenses, discounts, etc.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `name` (TEXT, NOT NULL)
- `description` (TEXT)
- `type` (TEXT, NOT NULL)
- `steps` (JSONB, Default: '[]')
- `auto_trigger` (BOOLEAN, Default: FALSE)
- `trigger_conditions` (JSONB, Default: '{}')
- `created_by` (UUID, Foreign Key -> auth.users.id)
- `is_active` (BOOLEAN, Default: TRUE)
- `created_at` (TIMESTAMPTZ, Default: now())
- `updated_at` (TIMESTAMPTZ, Default: now())

### `workflows`
Active workflow instances tracking pending approvals.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `template_id` (UUID, Foreign Key -> workflow_templates.id)
- `title` (TEXT, NOT NULL)
- `description` (TEXT)
- `type` (TEXT, Default: 'general')
- `trigger_type` (TEXT, Default: 'manual')
- `status` (workflow_status enum, Default: 'active')
- `steps` (JSONB, Default: '[]')
- `current_step` (INTEGER, Default: 0)
- `source_id` (TEXT)
- `source_type` (TEXT)
- `created_by` (UUID, Foreign Key -> auth.users.id)
- `assigned_role` (UUID, Foreign Key -> roles.id)
- `completed_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ, Default: now())
- `updated_at` (TIMESTAMPTZ, Default: now())

### `workflow_step_history`
Audit trail of actions taken in each step of a workflow.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `workflow_id` (UUID, Foreign Key -> workflows.id)
- `step_index` (INTEGER, NOT NULL)
- `step_name` (TEXT, NOT NULL)
- `action` (TEXT, NOT NULL)
- `acted_by` (UUID, Foreign Key -> auth.users.id)
- `notes` (TEXT)
- `created_at` (TIMESTAMPTZ, Default: now())

### `approvals`
General approvals list (POs, transfers, discounts) needing review.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `title` (TEXT, NOT NULL)
- `type` (TEXT, NOT NULL)
- `source_id` (TEXT)
- `source_type` (TEXT)
- `requester` (UUID, Foreign Key -> auth.users.id)
- `department` (TEXT)
- `amount` (NUMERIC(12,2))
- `description` (TEXT)
- `priority` (approval_priority enum, Default: 'medium')
- `status` (approval_status enum, Default: 'pending')
- `reviewed_by` (UUID, Foreign Key -> auth.users.id)
- `review_notes` (TEXT)
- `due_date` (DATE)
- `created_at` (TIMESTAMPTZ, Default: now())
- `updated_at` (TIMESTAMPTZ, Default: now())

---

## 7. Documents & File Storage
### `document_folders`
Folder hierarchy for document organization.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `name` (TEXT, NOT NULL)
- `parent_id` (UUID, Foreign Key -> document_folders.id)
- `path` (TEXT, Default: '/')
- `created_by` (UUID, Foreign Key -> auth.users.id)
- `created_at` (TIMESTAMPTZ, Default: now())

### `documents`
Uploaded files and generated reports stored in buckets.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `name` (TEXT, NOT NULL)
- `type` (document_type enum, Default: 'txt')
- `size_bytes` (BIGINT, Default: 0)
- `size_display` (TEXT)
- `folder_id` (UUID, Foreign Key -> document_folders.id)
- `folder_path` (TEXT, Default: '/')
- `mime_type` (TEXT)
- `author` (UUID, Foreign Key -> auth.users.id)
- `source` (TEXT)
- `storage_path` (TEXT)
- `storage_bucket` (TEXT, Default: 'documents')
- `tags` (TEXT[], Default: '{}')
- `version` (INTEGER, Default: 1)
- `is_archived` (BOOLEAN, Default: FALSE)
- `created_at` (TIMESTAMPTZ, Default: now())
- `updated_at` (TIMESTAMPTZ, Default: now())

### `document_shares`
Document permissions shared with users.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `document_id` (UUID, Foreign Key -> documents.id)
- `shared_with` (UUID, Foreign Key -> auth.users.id)
- `permission` (TEXT, Default: 'view')
- `created_at` (TIMESTAMPTZ, Default: now())

---

## 8. Chat, Notifications & Audit Logs
### `chat_channels`
Chat channels, group chats, or direct messages.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `name` (TEXT, NOT NULL)
- `type` (chat_channel_type enum, Default: 'channel')
- `description` (TEXT)
- `is_private` (BOOLEAN, Default: FALSE)
- `created_by` (UUID, Foreign Key -> auth.users.id)
- `created_at` (TIMESTAMPTZ, Default: now())
- `updated_at` (TIMESTAMPTZ, Default: now())

### `chat_channel_members`
User memberships in chat channels.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `channel_id` (UUID, Foreign Key -> chat_channels.id, UNIQUE with user_id)
- `user_id` (UUID, Foreign Key -> auth.users.id, UNIQUE with channel_id)
- `role` (TEXT, Default: 'member')
- `muted` (BOOLEAN, Default: FALSE)
- `last_read_at` (TIMESTAMPTZ, Default: now())
- `joined_at` (TIMESTAMPTZ, Default: now())

### `chat_messages`
Messages sent within chat channels.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `channel_id` (UUID, Foreign Key -> chat_channels.id)
- `sender_id` (UUID, Foreign Key -> auth.users.id)
- `content` (TEXT, NOT NULL)
- `reply_to` (UUID, Foreign Key -> chat_messages.id)
- `reactions` (JSONB, Default: '{}')
- `attachments` (JSONB, Default: '[]')
- `is_pinned` (BOOLEAN, Default: FALSE)
- `edited` (BOOLEAN, Default: FALSE)
- `deleted` (BOOLEAN, Default: FALSE)
- `created_at` (TIMESTAMPTZ, Default: now())
- `updated_at` (TIMESTAMPTZ, Default: now())

### `notifications`
In-app alerts for users regarding approvals, workflows, stock thresholds, etc.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `user_id` (UUID, Foreign Key -> auth.users.id)
- `type` (notification_type enum, Default: 'system')
- `title` (TEXT, NOT NULL)
- `message` (TEXT)
- `link` (TEXT)
- `metadata` (JSONB, Default: '{}')
- `read` (BOOLEAN, Default: FALSE)
- `created_at` (TIMESTAMPTZ, Default: now())

### `audit_log`
System audit trail documenting all user actions.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `user_id` (UUID, Foreign Key -> auth.users.id)
- `user_name` (TEXT)
- `user_role` (TEXT)
- `action` (TEXT, NOT NULL)
- `module` (TEXT, NOT NULL)
- `target` (TEXT)
- `detail` (TEXT)
- `severity` (audit_severity enum, Default: 'info')
- `metadata` (JSONB, Default: '{}')
- `ip_address` (TEXT)
- `user_agent` (TEXT)
- `created_at` (TIMESTAMPTZ, Default: now())

---

## 9. App Settings, Reports & Templates
### `app_settings`
Global and tenant configuration parameters.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `key` (TEXT, NOT NULL, UNIQUE)
- `value` (JSONB, NOT NULL)
- `updated_by` (UUID, Foreign Key -> auth.users.id)
- `updated_at` (TIMESTAMPTZ, Default: now())

### `saved_reports`
User-saved report views and configurations.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `name` (TEXT, NOT NULL)
- `type` (TEXT, NOT NULL)
- `filters` (JSONB, Default: '{}')
- `columns` (TEXT[], Default: '{}')
- `schedule` (TEXT)
- `last_generated_at` (TIMESTAMPTZ)
- `created_by` (UUID, Foreign Key -> auth.users.id)
- `is_favorite` (BOOLEAN, Default: FALSE)
- `created_at` (TIMESTAMPTZ, Default: now())
- `updated_at` (TIMESTAMPTZ, Default: now())

### `receipt_templates`
Layout and styling presets for receipts and invoices.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `name` (TEXT, NOT NULL)
- `type` (TEXT, Default: 'receipt')
- `layout` (JSONB, Default: '{}')
- `header_text` (TEXT)
- `footer_text` (TEXT)
- `show_logo` (BOOLEAN, Default: TRUE)
- `show_tax` (BOOLEAN, Default: TRUE)
- `is_default` (BOOLEAN, Default: FALSE)
- `created_at` (TIMESTAMPTZ, Default: now())
- `updated_at` (TIMESTAMPTZ, Default: now())

### `user_sessions`
Active and historical user login sessions.
- `id` (UUID, Primary Key, Default: uuid_generate_v4())
- `user_id` (UUID, Foreign Key -> auth.users.id)
- `ip_address` (TEXT)
- `user_agent` (TEXT)
- `started_at` (TIMESTAMPTZ, Default: now())
- `ended_at` (TIMESTAMPTZ)
- `is_active` (BOOLEAN, Default: TRUE)
