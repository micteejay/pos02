import { getDb } from "./db";
import { enqueueSync } from "./sync-engine";
import { type InventoryItem, type SaleRecord } from "@/hooks/use-shared-data";
import { type Customer } from "@/hooks/use-customers";

/**
 * Local Inventory Repository for Tauri SQLite operations.
 */
export const LocalInventoryRepository = {
  async getAll(): Promise<InventoryItem[]> {
    const db = await getDb();
    const rows = await db.select<any[]>("SELECT * FROM products ORDER BY name ASC");
    return rows.map((r) => ({
      id: r.id,
      sku: r.sku,
      name: r.name,
      category: r.category_id || "Uncategorized",
      warehouse: "",
      qty: r.stock,
      reorder: r.reorder_level || 10,
      costPrice: 0, // SQLite stock matches simplified schema
      price: r.price,
      status: r.stock <= (r.reorder_level || 10) ? "low" : "ok",
      barcode: r.sku // Fallback to SKU
    }));
  },

  async insert(item: InventoryItem, companyId: string | null): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();
    const id = item.id || crypto.randomUUID();
    
    // Write locally
    await db.execute(
      `INSERT OR REPLACE INTO products (id, name, price, stock, reorder_level, sku, category_id, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, item.name, item.price, item.qty, item.reorder, item.sku, item.category, now]
    );

    // Queue sync to Supabase
    await enqueueSync("inventory_items", "INSERT", {
      id,
      sku: item.sku,
      name: item.name,
      category: item.category,
      qty: item.qty,
      reorder_point: item.reorder,
      price: item.price,
      unit: item.baseUnit || "pcs",
      company_id: companyId
    });
  },

  async update(sku: string, id: string, updates: Partial<InventoryItem>): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();

    // Fetch existing
    const existing = await db.select<any[]>("SELECT * FROM products WHERE id = ?", [id]);
    if (existing.length === 0) return;
    const current = existing[0];

    const stock = updates.qty !== undefined ? updates.qty : current.stock;
    const name = updates.name !== undefined ? updates.name : current.name;
    const price = updates.price !== undefined ? updates.price : current.price;
    const category = updates.category !== undefined ? updates.category : current.category_id;
    const reorder = updates.reorder !== undefined ? updates.reorder : current.reorder_level;

    // Update locally
    await db.execute(
      `UPDATE products SET name = ?, price = ?, stock = ?, category_id = ?, reorder_level = ?, updated_at = ? 
       WHERE id = ?`,
      [name, price, stock, category, reorder, now, id]
    );

    // Queue sync to Supabase
    await enqueueSync("inventory_items", "UPDATE", {
      id,
      sku,
      name,
      category,
      qty: stock,
      reorder_point: reorder,
      price
    });
  },

  async adjustQty(sku: string, id: string, delta: number, allowNegative: boolean, threshold: number): Promise<number> {
    const db = await getDb();
    const now = new Date().toISOString();

    const existing = await db.select<any[]>("SELECT * FROM products WHERE id = ?", [id]);
    if (existing.length === 0) return 0;
    const current = existing[0];

    let newStock = current.stock + delta;
    if (!allowNegative && newStock < 0) {
      newStock = 0;
    }

    await db.execute("UPDATE products SET stock = ?, updated_at = ? WHERE id = ?", [newStock, now, id]);

    // Queue sync
    await enqueueSync("inventory_items", "UPDATE", {
      id,
      qty: newStock
    });

    return newStock;
  }
};

/**
 * Local Sales Repository for Tauri SQLite transactions.
 */
export const LocalSalesRepository = {
  async getAll(): Promise<SaleRecord[]> {
    const db = await getDb();
    const txns = await db.select<any[]>("SELECT * FROM sales_transactions ORDER BY created_at DESC LIMIT 100");
    const sales: SaleRecord[] = [];

    for (const txn of txns) {
      const items = await db.select<any[]>("SELECT * FROM sales_items WHERE transaction_id = ?", [txn.id]);
      sales.push({
        id: txn.transaction_number,
        total: txn.total,
        customer: txn.customer_name || "Walk-in",
        method: txn.payment_method,
        date: txn.created_at,
        store: "",
        createdBy: "",
        createdByRole: "",
        subtotal: txn.subtotal,
        tax: txn.tax,
        discount: txn.discount,
        items: items.map((i) => ({
          name: i.name || `Product (${i.product_id})`,
          sku: i.product_id || "",
          qty: i.qty,
          price: i.price,
          unitName: "",
          unitFactor: 1
        }))
      });
    }

    return sales;
  },

  async insert(sale: Omit<SaleRecord, "id" | "date">, companyId: string | null, userId: string | null): Promise<void> {
    const db = await getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const txnNumber = `TXN-OFF-${Date.now()}`;

    const subtotal = sale.subtotal ?? sale.total;
    const tax = sale.tax ?? 0;
    const discount = sale.discount ?? 0;

    // 1. Write transaction locally
    await db.execute(
      `INSERT INTO sales_transactions (id, transaction_number, customer_id, customer_name, total, tax, discount, payment_method, status, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, txnNumber, sale.customerId || null, sale.customer, sale.total, tax, discount, sale.method, "completed", now, now]
    );

    // 2. Write transaction items locally
    for (const item of sale.items) {
      const lineId = crypto.randomUUID();
      await db.execute(
        `INSERT INTO sales_items (id, transaction_id, product_id, name, qty, price, total) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [lineId, id, item.sku, item.name, item.qty, item.price, item.price * item.qty]
      );
    }

    // 3. Queue sync job for transaction
    await enqueueSync("sales_transactions", "INSERT", {
      id,
      transaction_number: txnNumber,
      customer_name: sale.customer,
      customer_id: sale.customerId || null,
      customer_email: sale.customerEmail || null,
      customer_phone: sale.customerPhone || null,
      payment_method: sale.method,
      subtotal,
      tax,
      discount,
      total: sale.total,
      amount_tendered: sale.amountTendered || 0,
      change_given: sale.change || 0,
      status: "completed",
      company_id: companyId,
      cashier_id: userId
    });

    // 4. Queue sync jobs for transaction items
    for (const item of sale.items) {
      const lineId = crypto.randomUUID();
      await enqueueSync("sales_transaction_items", "INSERT", {
        transaction_id: id,
        name: item.name,
        sku: item.sku,
        qty: item.qty,
        price: item.price,
        total: item.price * item.qty,
        unit_name: item.unitName || null,
        unit_factor: item.unitFactor || 1,
        base_qty: item.baseQty || item.qty * (item.unitFactor || 1)
      });
    }
  }
};

/**
 * Local Customer Repository for Tauri SQLite operations.
 */
export const LocalCustomerRepository = {
  async getAll(): Promise<Customer[]> {
    const db = await getDb();
    const rows = await db.select<any[]>("SELECT * FROM customers ORDER BY name ASC");
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email || null,
      phone: r.phone || null,
      address: r.address || null,
      city: r.city || null,
      notes: r.notes || null,
      totalSpend: Number(r.total_spend) || 0,
      totalOrders: Number(r.total_orders) || 0,
      lastPurchaseAt: r.last_purchase_at || null,
      createdAt: r.created_at,
      outstanding_balance: Number(r.outstanding_balance) || 0,
      loyalty_points: Number(r.loyalty_points) || 0
    }));
  },

  async insert(input: Partial<Customer> & { name: string }, companyId: string | null, userId: string | null): Promise<Customer> {
    const db = await getDb();
    const id = input.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const customer: Customer = {
      id,
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      address: input.address || null,
      city: input.city || null,
      notes: input.notes || null,
      totalSpend: 0,
      totalOrders: 0,
      lastPurchaseAt: null,
      createdAt: now,
      outstanding_balance: 0,
      loyalty_points: 0
    };

    await db.execute(
      `INSERT INTO customers (id, name, email, phone, address, city, notes, total_spend, total_orders, last_purchase_at, created_at, outstanding_balance, loyalty_points) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, customer.name, customer.email, customer.phone, customer.address, customer.city, customer.notes, 0, 0, null, now, 0, 0]
    );

    // Queue sync to Supabase
    await enqueueSync("customers", "INSERT", {
      id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      notes: customer.notes,
      company_id: companyId,
      created_by: userId
    });

    return customer;
  },

  async update(id: string, updates: Partial<Customer>): Promise<void> {
    const db = await getDb();
    
    // Fetch existing
    const existing = await db.select<any[]>("SELECT * FROM customers WHERE id = ?", [id]);
    if (existing.length === 0) return;
    const current = existing[0];

    const name = updates.name !== undefined ? updates.name : current.name;
    const email = updates.email !== undefined ? updates.email : current.email;
    const phone = updates.phone !== undefined ? updates.phone : current.phone;
    const address = updates.address !== undefined ? updates.address : current.address;
    const city = updates.city !== undefined ? updates.city : current.city;
    const notes = updates.notes !== undefined ? updates.notes : current.notes;

    await db.execute(
      `UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, city = ?, notes = ? WHERE id = ?`,
      [name, email, phone, address, city, notes, id]
    );

    // Queue sync to Supabase
    await enqueueSync("customers", "UPDATE", {
      id,
      name,
      email,
      phone,
      address,
      city,
      notes
    });
  }
};

