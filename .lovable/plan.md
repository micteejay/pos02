

# Barcode Implementation Plan

## Current State
- The `inventory_items` table has a `barcode` column but it is never used in the frontend
- The `InventoryItem` interface lacks a `barcode` field
- POS page has a non-functional barcode icon button and search that only matches by name/SKU
- Inventory add/edit forms have no barcode field
- No barcode scanning or generation capability exists

## What Will Be Built

### 1. Add barcode field throughout the data layer
- Add `barcode?: string` to the `InventoryItem` interface in `use-shared-data.tsx`
- Include `barcode` in insert, update, and fetch operations for inventory items

### 2. Barcode field in Inventory forms
- Add a barcode input field to both `AddItemForm` and `EditItemForm` in `InventoryPage.tsx`
- Auto-generate a barcode (EAN-13 format) if left empty, or allow manual entry

### 3. Barcode scanning in POS
- Install `html5-qrcode` library for camera-based barcode scanning
- Wire the existing barcode button in POS to open a camera scanner modal
- When a barcode is scanned, search inventory by barcode and auto-add the matching product to the cart
- Also update the search filter to match against the `barcode` field

### 4. Barcode display on inventory items
- Show barcode value on inventory item cards/rows
- Generate a visual barcode (using `JsBarcode` library) that can be printed from item detail views

### 5. Barcode scanning in Inventory search
- Allow searching inventory items by barcode in the stock tab

## Technical Details

**New dependencies**: `html5-qrcode` (camera scanner), `jsbarcode` (barcode image generation)

**Files to modify**:
- `src/hooks/use-shared-data.tsx` — add `barcode` to interface, fetch, insert, update
- `src/pages/POSPage.tsx` — scanner modal, search by barcode, auto-add on scan
- `src/pages/InventoryPage.tsx` — barcode field in add/edit forms, barcode display
- New component: `src/components/BarcodeScanner.tsx` — reusable camera scanner modal
- New component: `src/components/BarcodeDisplay.tsx` — renders a visual barcode from a string

**Scanner flow**:
1. User taps barcode button → camera opens in a modal
2. Camera reads barcode (EAN-13, Code128, UPC, etc.)
3. Match against `inventory_items.barcode` column
4. If found, add to cart (POS) or highlight item (Inventory)
5. If not found, show "Product not found" toast

