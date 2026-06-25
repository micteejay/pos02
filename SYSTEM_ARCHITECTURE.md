# POS System Architecture Diagram

## Overview
This is a multi-platform Point of Sale (POS) system built with React, TypeScript, and Tauri. It supports web, desktop (via Tauri), and mobile (via Capacitor) deployments with an offline-first architecture.

## Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn/ui (Radix UI components)
- **Styling**: Tailwind CSS
- **State Management**: React Context + TanStack Query
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod validation

### Desktop/Mobile
- **Desktop**: Tauri v2 (native desktop app)
- **Mobile**: Capacitor v8 (iOS/Android)
- **Local Database**: SQLite (via Tauri plugin)

### Backend/Cloud
- **Backend-as-a-Service**: Supabase
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE LAYER                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Web App    │  │  Desktop App │  │   iOS App    │  │  Android App │   │
│  │  (Vite/React)│  │   (Tauri)    │  │  (Capacitor) │  │  (Capacitor) │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                  │                  │                  │           │
│         └──────────────────┴──────────────────┴──────────────────┘           │
│                                    │                                           │
│                         ┌──────────▼──────────┐                                │
│                         │   React Application │                                │
│                         │   (App.tsx)         │                                │
│                         └──────────┬──────────┘                                │
│                                    │                                           │
└────────────────────────────────────┼───────────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────────────┐
│                              REACT LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Provider Hierarchy                            │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  ErrorBoundary                                                       │   │
│  │  └─ QueryClientProvider (TanStack Query)                            │   │
│  │     └─ ThemeProvider (dark/light mode)                              │   │
│  │        └─ AuthProvider (Supabase auth + user profile)               │   │
│  │           └─ AppSettingsProvider (app config + permissions)          │   │
│  │              └─ AppEventsProvider (event bus)                       │   │
│  │                 └─ SharedDataProvider (inventory, sales, customers) │   │
│  │                    └─ UpdateProvider (app updates)                   │   │
│  │                       └─ PermissionApprovalsProvider                 │   │
│  │                          └─ TooltipProvider                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Routing (React Router)                        │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  /login              → LoginPage                                     │   │
│  │  /signup             → SignupPage                                    │   │
│  │  /setup-company      → CompanySetupPage                              │   │
│  │  /                   → Index (Dashboard)                              │   │
│  │  /pos                → POSPage                                       │   │
│  │  /inventory          → InventoryPage                                 │   │
│  │  /sales              → SalesPage                                     │   │
│  │  /customers          → CustomersPage                                 │   │
│  │  /invoices           → InvoicePage                                   │   │
│  │  /supply             → SupplyPage                                    │   │
│  │  /reports            → ReportsPage                                   │   │
│  │  /organization       → OrganizationPage                              │   │
│  │  /users              → UsersPage                                     │   │
│  │  /approvals          → ApprovalsPage                                 │   │
│  │  /audit              → AuditLogPage                                  │   │
│  │  /documents          → DocumentsPage                                 │   │
│  │  /chat               → ChatPage                                      │   │
│  │  /workflows          → WorkflowsPage                                 │   │
│  │  /notifications      → NotificationsPage                             │   │
│  │  /settings           → SettingsPage                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                           │
└────────────────────────────────────┼───────────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────────────┐
│                         CUSTOM HOOKS LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │ useAuth           │  │ useAppSettings   │  │ useSharedData    │         │
│  │ - Authentication  │  │ - App config     │  │ - Inventory      │         │
│  │ - User profile    │  │ - Permissions    │  │ - Sales          │         │
│  │ - Company profile │  │ - Roles          │  │ - Customers      │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │ useAppEvents     │  │ useCustomers     │  │ useAudit         │         │
│  │ - Event bus       │  │ - Customer CRUD  │  │ - Audit logging  │         │
│  │ - Pub/sub         │  │ - Payments       │  │                  │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │ useTheme         │  │ usePermissions   │  │ useUpdater       │         │
│  │ - Dark/light     │  │ - RBAC checks    │  │ - App updates    │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│                                    │                                           │
└────────────────────────────────────┼───────────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────────────┐
│                         DATA ACCESS LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Repositories Pattern                              │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  LocalInventoryRepository                                            │   │
│  │  - getAll()          - Fetch from local SQLite                       │   │
│  │  - insert()          - Write local + queue sync                      │   │
│  │  - update()          - Update local + queue sync                     │   │
│  │  - adjustQty()        - Adjust stock + queue sync                    │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  LocalSalesRepository                                                │   │
│  │  - getAll()          - Fetch transactions from local SQLite         │   │
│  │  - insert()          - Write transaction + items + queue sync       │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  LocalCustomerRepository                                              │   │
│  │  - getAll()          - Fetch customers from local SQLite             │   │
│  │  - insert()          - Create customer + queue sync                 │   │
│  │  - update()          - Update customer + queue sync                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                           │
└────────────────────────────────────┼───────────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────────────┐
│                         DATABASE LAYER                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Local SQLite (Tauri)                             │   │
│  │                    src/lib/db.ts                                     │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  Tables:                                                            │   │
│  │  - products              (inventory items)                          │   │
│  │  - sales_transactions    (sales headers)                           │   │
│  │  - sales_items          (sales line items)                         │   │
│  │  - customers             (customer records)                         │   │
│  │  - invoices              (invoice headers)                          │   │
│  │  - invoice_items         (invoice line items)                       │   │
│  │  - stock_transfers       (warehouse transfers)                      │   │
│  │  - sync_queue            (offline sync outbox)                      │   │
│  │  - audit_log             (audit trail)                              │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  Fallback: Mock DB (localStorage) for browser development           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                           │
│                                    │ Sync Engine                               │
│                                    │ src/lib/sync-engine.ts                    │
│                                    │                                           │
│  ┌─────────────────────────────────┴─────────────────────────────────────┐   │
│  │                    Cloud Database (Supabase)                          │   │
│  │                    PostgreSQL                                        │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  Tables (mirrors local + additional):                               │   │
│  │  - inventory_items         (products)                               │   │
│  │  - sales_transactions      (sales)                                  │   │
│  │  - sales_transaction_items (sales items)                            │   │
│  │  - customers               (customers)                              │   │
│  │  - invoices                (invoices)                               │   │
│  │  - invoice_items           (invoice items)                          │   │
│  │  - company_profiles        (company settings)                       │   │
│  │  - profiles                (user profiles)                          │   │
│  │  - user_roles              (role assignments)                       │   │
│  │  - stores                  (store locations)                        │   │
│  │  - warehouses              (warehouse locations)                    │   │
│  │  - departments             (organizational units)                   │   │
│  │  - approvals               (approval workflows)                     │   │
│  │  - notifications          (user notifications)                      │   │
│  │  - chat_messages           (internal chat)                          │   │
│  │  - documents              (file storage)                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Sync Engine Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │     │  Repository │     │   Local     │     │   Sync      │
│   Action    │────▶│   Layer     │────▶│   SQLite    │────▶│   Queue     │
└─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                                  │
                                                                  │ enqueueSync()
                                                                  ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Cloud     │◀────│  Sync       │◀────│   Sync      │◀────│   Trigger   │
│  Supabase   │     │   Engine    │     │   Queue     │     │   Sync      │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                            │
                            │ triggerSync() (45s intervals)
                            │ pullProductsFromCloud() (90s intervals)
                            │ pullCustomersFromCloud() (120s intervals)
                            │ window.addEventListener('online')
                            ▼
                   ┌─────────────────┐
                   │  Background     │
                   │  Sync Process   │
                   └─────────────────┘
```

## Key Features by Module

### 1. Authentication & Authorization
- **File**: `src/hooks/use-auth.tsx`
- **Provider**: Supabase Auth
- **Features**:
  - Email/password authentication
  - Role-based access control (RBAC)
  - Company profile management
  - Self-healing company_id inference
  - Synthetic email login for staff accounts

### 2. Inventory Management
- **Pages**: InventoryPage, SupplyPage
- **Repository**: LocalInventoryRepository
- **Features**:
  - Product CRUD operations
  - Stock level tracking
  - Low stock alerts
  - Barcode scanning
  - Multi-unit support
  - Category management
  - CSV import/export

### 3. Point of Sale (POS)
- **Page**: POSPage
- **Features**:
  - Product search and selection
  - Cart management
  - Customer selection
  - Multiple payment methods
  - Receipt printing
  - Barcode scanner integration
  - Tax and discount calculation

### 4. Sales Management
- **Pages**: SalesPage, CustomersPage, InvoicePage
- **Repository**: LocalSalesRepository, LocalCustomerRepository
- **Features**:
  - Transaction history
  - Customer management
  - Invoice generation
  - Payment tracking
  - Sales analytics
  - Customer loyalty points

### 5. Reporting
- **Page**: ReportsPage
- **Features**:
  - Sales reports
  - Inventory reports
  - Profit/loss analysis
  - End-of-day reports
  - Expense tracking
  - Operations reports

### 6. Organization Management
- **Page**: OrganizationPage
- **Features**:
  - Multi-store support
  - Warehouse management
  - Department hierarchy
  - Employee management

### 7. Approval Workflows
- **Page**: ApprovalsPage
- **Features**:
  - Purchase order approvals
  - Expense approvals
  - Role-based approval chains
  - Approval history

### 8. Audit Logging
- **Page**: AuditLogPage
- **Repository**: Direct SQLite writes
- **Features**:
  - Action tracking
  - User attribution
  - Timestamped records
  - Configurable retention

## Component Structure

```
src/
├── main.tsx                    # App entry point
├── App.tsx                     # Root component with routing & providers
├── pages/                      # Route components (25+ pages)
│   ├── Index.tsx              # Dashboard
│   ├── POSPage.tsx            # Point of Sale
│   ├── InventoryPage.tsx      # Inventory management
│   ├── SalesPage.tsx          # Sales tracking
│   ├── ReportsPage.tsx        # Analytics & reports
│   └── ...
├── components/                 # Reusable components
│   ├── ui/                    # shadcn/ui components (49 items)
│   ├── AppSidebar.tsx         # Navigation sidebar
│   ├── CommandPalette.tsx     # Quick actions
│   ├── BarcodeScanner.tsx     # QR/barcode scanning
│   ├── PaymentDialog.tsx      # Payment processing
│   ├── ReceiptTemplate.tsx    # Receipt printing
│   └── ...
├── hooks/                      # Custom React hooks
│   ├── use-auth.tsx           # Authentication
│   ├── use-app-settings.tsx   # App config & permissions
│   ├── use-shared-data.tsx    # Global state (inventory, sales, etc.)
│   ├── use-customers.tsx      # Customer management
│   └── ...
├── lib/                        # Core utilities
│   ├── db.ts                  # SQLite connection & schema
│   ├── repositories.ts        # Data access layer
│   ├── sync-engine.ts         # Offline-first sync
│   ├── print.ts               # Printing utilities
│   └── ...
└── integrations/               # External services
    └── supabase/              # Supabase client & types
```

## Data Flow Example: POS Sale

```
1. User adds product to cart (POSPage)
   ↓
2. Cart state updated (useSharedData context)
   ↓
3. User completes sale → PaymentDialog
   ↓
4. LocalSalesRepository.insert()
   ├─ Write to local SQLite (sales_transactions + sales_items)
   ├─ Adjust product stock (LocalInventoryRepository.adjustQty)
   └─ Enqueue sync jobs (sync_queue table)
   ↓
5. Sync Engine processes queue
   ├─ Check network connectivity
   ├─ Push to Supabase (sales_transactions, sales_transaction_items)
   └─ Remove from sync_queue on success
   ↓
6. Receipt generated (ReceiptTemplate)
   └─ Printed via Tauri printer plugin
```

## Offline-First Architecture

The system uses a dual-database approach:

1. **Local SQLite**: Primary database for all operations
   - Fast, offline-capable
   - Stores all critical business data
   - Works without internet connection

2. **Supabase Cloud**: Backup and sync target
   - Centralized data storage
   - Multi-device synchronization
   - Real-time collaboration

3. **Sync Queue**: Bridges the two databases
   - Records all write operations
   - Processes on network availability
   - Maintains operation order
   - Handles conflicts gracefully

## Security Model

- **Authentication**: Supabase Auth with JWT tokens
- **Authorization**: Role-based permissions (90+ permission types)
- **Row-Level Security**: Supabase RLS policies on cloud tables
- **Permission Guards**: Client-side route protection (PermissionGuard component)
- **Audit Trail**: All actions logged to audit_log table

## Deployment Targets

1. **Web**: Vite build → Static hosting
2. **Desktop**: Tauri build → Native installers (Windows, macOS, Linux)
3. **Mobile**: Capacitor build → App Store & Google Play

## Key Dependencies

- **UI**: @radix-ui/* (component primitives), lucide-react (icons)
- **Forms**: react-hook-form, @hookform/resolvers, zod
- **Data**: @tanstack/react-query, @supabase/supabase-js
- **Desktop**: @tauri-apps/api, @tauri-apps/plugin-sql
- **Mobile**: @capacitor/* (iOS/Android plugins)
- **Printing**: tauri-plugin-printer-v2, jspdf
- **Scanning**: html5-qrcode, jsbarcode
- **Charts**: recharts
