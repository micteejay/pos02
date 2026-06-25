import Database from "@tauri-apps/plugin-sql";

let dbInstance: any = null;

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Creates a mock database helper for running in the browser during development.
 */
function createMockDb() {
  const STORAGE_KEY = "pos_mock_db";

  const defaultTables = (): Record<string, any[]> => ({
    products: [],
    sales_transactions: [],
    sales_items: [],
    sync_queue: [],
    customers: [],
    invoices: [],
    invoice_items: [],
    stock_transfers: [],
    audit_log: []
  });

  const loadStorage = (): Record<string, any[]> => {
    if (typeof window === "undefined") return defaultTables();
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Ensure new table keys exist for older caches
        const defaults = defaultTables();
        for (const key of Object.keys(defaults)) {
          if (!parsed[key]) parsed[key] = [];
        }
        return parsed;
      } catch (e) {
        console.error("[MockDB] Failed to parse local storage", e);
      }
    }
    return defaultTables();
  };

  const saveStorage = (data: Record<string, any[]>) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  };

  return {
    async execute(query: string, values: any[] = []): Promise<{ rowsAffected: number; lastInsertId: number }> {
      console.log("[MockDB] Execute:", query, values);
      
      const storage = loadStorage();
      const lowerQuery = query.toLowerCase().replace(/\s+/g, " ").trim();
      let rowsAffected = 0;

      if (lowerQuery.includes("insert into sync_queue") || lowerQuery.includes("insert or replace into sync_queue")) {
        const payloadStr = values[2] || "{}";
        storage.sync_queue.push({
          id: storage.sync_queue.length + 1,
          table_name: values[0],
          action: values[1],
          payload: payloadStr,
          created_at: values[3] || new Date().toISOString()
        });
        rowsAffected = 1;
      } 
      else if (lowerQuery.includes("insert into products") || lowerQuery.includes("insert or replace into products")) {
        const [id, name, price, stock, reorder_level, sku, category_id, updated_at] = values;
        const existingIdx = storage.products.findIndex(p => p.id === id);
        const item = { id, name, price, stock, reorder_level, sku, category_id, updated_at };
        if (existingIdx >= 0) {
          storage.products[existingIdx] = item;
        } else {
          storage.products.push(item);
        }
        rowsAffected = 1;
      }
      else if (lowerQuery.includes("update products set stock =") && lowerQuery.includes("where id =")) {
        const [stock, updated_at, id] = values;
        const item = storage.products.find(p => p.id === id);
        if (item) {
          item.stock = stock;
          item.updated_at = updated_at;
          rowsAffected = 1;
        }
      }
      else if (lowerQuery.includes("update products set name =") && lowerQuery.includes("where id =")) {
        const [name, price, stock, category_id, reorder_level, updated_at, id] = values;
        const item = storage.products.find(p => p.id === id);
        if (item) {
          item.name = name;
          item.price = price;
          item.stock = stock;
          item.category_id = category_id;
          item.reorder_level = reorder_level;
          item.updated_at = updated_at;
          rowsAffected = 1;
        }
      }
      else if (lowerQuery.includes("delete from products where id =")) {
        const [id] = values;
        const lenBefore = storage.products.length;
        storage.products = storage.products.filter(p => p.id !== id);
        rowsAffected = lenBefore - storage.products.length;
      }
      else if (lowerQuery.includes("insert into sales_transactions") || lowerQuery.includes("insert or replace into sales_transactions")) {
        if (values.length === 11) {
          const [id, transaction_number, customer_id, customer_name, total, tax, discount, payment_method, status, created_at, updated_at] = values;
          const existingIdx = storage.sales_transactions.findIndex(t => t.id === id);
          const item = { id, transaction_number, customer_id, customer_name, total, tax, discount, payment_method, status, created_at, updated_at };
          if (existingIdx >= 0) {
            storage.sales_transactions[existingIdx] = item;
          } else {
            storage.sales_transactions.push(item);
          }
        } else {
          const [id, transaction_number, customer_id, total, tax, discount, payment_method, status, created_at, updated_at] = values;
          const existingIdx = storage.sales_transactions.findIndex(t => t.id === id);
          const item = { id, transaction_number, customer_id, customer_name: "Walk-in", total, tax, discount, payment_method, status, created_at, updated_at };
          if (existingIdx >= 0) {
            storage.sales_transactions[existingIdx] = item;
          } else {
            storage.sales_transactions.push(item);
          }
        }
        rowsAffected = 1;
      }
      else if (lowerQuery.includes("insert into sales_items") || lowerQuery.includes("insert or replace into sales_items")) {
        if (values.length === 7) {
          const [id, transaction_id, product_id, name, qty, price, total] = values;
          const existingIdx = storage.sales_items.findIndex(si => si.id === id);
          const item = { id, transaction_id, product_id, name, qty, price, total };
          if (existingIdx >= 0) {
            storage.sales_items[existingIdx] = item;
          } else {
            storage.sales_items.push(item);
          }
        } else {
          const [id, transaction_id, product_id, qty, price, total] = values;
          const existingIdx = storage.sales_items.findIndex(si => si.id === id);
          const item = { id, transaction_id, product_id, name: `Product (${product_id})`, qty, price, total };
          if (existingIdx >= 0) {
            storage.sales_items[existingIdx] = item;
          } else {
            storage.sales_items.push(item);
          }
        }
        rowsAffected = 1;
      }
      else if (lowerQuery.includes("insert into customers") || lowerQuery.includes("insert or replace into customers")) {
        let id, name, email, phone, address, city, notes, total_spend, total_orders, last_purchase_at, created_at, outstanding_balance = 0, loyalty_points = 0;
        if (values.length === 13) {
          [id, name, email, phone, address, city, notes, total_spend, total_orders, last_purchase_at, created_at, outstanding_balance, loyalty_points] = values;
        } else {
          [id, name, email, phone, address, city, notes, total_spend, total_orders, last_purchase_at, created_at] = values;
        }
        const existingIdx = storage.customers.findIndex(c => c.id === id);
        const item = { id, name, email, phone, address, city, notes, total_spend, total_orders, last_purchase_at, created_at, outstanding_balance, loyalty_points };
        if (existingIdx >= 0) {
          storage.customers[existingIdx] = { ...storage.customers[existingIdx], ...item };
        } else {
          storage.customers.push(item);
        }
        rowsAffected = 1;
      }
      else if (lowerQuery.includes("update customers set outstanding_balance =") && lowerQuery.includes("where id =")) {
        const [outstanding_balance, id] = values;
        const item = storage.customers.find(c => c.id === id);
        if (item) {
          item.outstanding_balance = outstanding_balance;
          rowsAffected = 1;
        }
      }
      else if (lowerQuery.includes("update customers set name =") && lowerQuery.includes("where id =")) {
        const [name, email, phone, address, city, notes, id] = values;
        const item = storage.customers.find(c => c.id === id);
        if (item) {
          item.name = name;
          item.email = email;
          item.phone = phone;
          item.address = address;
          item.city = city;
          item.notes = notes;
          rowsAffected = 1;
        }
      }
      else if (lowerQuery.includes("update customers set total_spend =") && lowerQuery.includes("where id =")) {
        const [total_spend, total_orders, last_purchase_at, id] = values;
        const item = storage.customers.find(c => c.id === id);
        if (item) {
          item.total_spend = total_spend;
          item.total_orders = total_orders;
          item.last_purchase_at = last_purchase_at;
          rowsAffected = 1;
        }
      }
      else if (lowerQuery.includes("delete from customers where id =")) {
        const [id] = values;
        const lenBefore = storage.customers.length;
        storage.customers = storage.customers.filter(c => c.id !== id);
        rowsAffected = lenBefore - storage.customers.length;
      }
      else if (lowerQuery.includes("delete from sync_queue where id =")) {
        const [id] = values;
        const lenBefore = storage.sync_queue.length;
        storage.sync_queue = storage.sync_queue.filter(job => job.id !== id);
        rowsAffected = lenBefore - storage.sync_queue.length;
      }
      // --- Invoices ---
      else if (lowerQuery.includes("insert into invoices") || lowerQuery.includes("insert or replace into invoices")) {
        const [id, number, type, customer_name, customer_address, customer_id, date, notes, service_charge_percent, status, company_id, created_by, attachments, created_at] = values;
        const existingIdx = storage.invoices.findIndex(i => i.id === id);
        const item = { id, number, type, customer_name, customer_address, customer_id, date, notes, service_charge_percent, status, company_id, created_by, attachments, created_at };
        if (existingIdx >= 0) { storage.invoices[existingIdx] = item; } else { storage.invoices.push(item); }
        rowsAffected = 1;
      }
      else if (lowerQuery.includes("update invoices set") && lowerQuery.includes("where id =")) {
        const id = values[values.length - 1];
        const item = storage.invoices.find(i => i.id === id);
        if (item) {
          if (lowerQuery.includes("status =")) item.status = values[0];
          if (lowerQuery.includes("type =")) { item.type = values[0]; item.number = values[1]; item.status = values[2]; }
          rowsAffected = 1;
        }
      }
      else if (lowerQuery.includes("delete from invoices where id =")) {
        const [id] = values;
        storage.invoices = storage.invoices.filter(i => i.id !== id);
        rowsAffected = 1;
      }
      // --- Invoice Items ---
      else if (lowerQuery.includes("insert into invoice_items") || lowerQuery.includes("insert or replace into invoice_items")) {
        const [id, invoice_id, description, qty, rate, inventory_item_id, unit_name, unit_factor] = values;
        const existingIdx = storage.invoice_items.findIndex(i => i.id === id);
        const item = { id, invoice_id, description, qty, rate, inventory_item_id, unit_name, unit_factor };
        if (existingIdx >= 0) { storage.invoice_items[existingIdx] = item; } else { storage.invoice_items.push(item); }
        rowsAffected = 1;
      }
      else if (lowerQuery.includes("delete from invoice_items where invoice_id =")) {
        const [invoice_id] = values;
        storage.invoice_items = storage.invoice_items.filter(i => i.invoice_id !== invoice_id);
        rowsAffected = 1;
      }
      // --- Stock Transfers ---
      else if (lowerQuery.includes("insert into stock_transfers") || lowerQuery.includes("insert or replace into stock_transfers")) {
        const [id, transfer_number, from_store_id, to_store_id, status, items_json, created_by, created_at] = values;
        const existingIdx = storage.stock_transfers.findIndex(t => t.id === id);
        const item = { id, transfer_number, from_store_id, to_store_id, status, items_json, created_by, created_at };
        if (existingIdx >= 0) { storage.stock_transfers[existingIdx] = item; } else { storage.stock_transfers.push(item); }
        rowsAffected = 1;
      }
      else if (lowerQuery.includes("update stock_transfers set status =") && lowerQuery.includes("where id =")) {
        const [status, id] = values;
        const item = storage.stock_transfers.find(t => t.id === id);
        if (item) { item.status = status; rowsAffected = 1; }
      }
      // --- Audit Log ---
      else if (lowerQuery.includes("insert into audit_log") || lowerQuery.includes("insert or replace into audit_log")) {
        const [id, action, details, user_name, created_at] = values;
        storage.audit_log.push({ id, action, details, user_name, created_at });
        rowsAffected = 1;
      }

      saveStorage(storage);
      return { rowsAffected, lastInsertId: Date.now() };
    },

    async select<T>(query: string, values: any[] = []): Promise<T> {
      console.log("[MockDB] Select:", query, values);
      
      const storage = loadStorage();
      const lowerQuery = query.toLowerCase().replace(/\s+/g, " ").trim();
      
      if (lowerQuery.includes("from products")) {
        if (lowerQuery.includes("where id = ?") || lowerQuery.includes("where id =")) {
          const id = values[0];
          return storage.products.filter(p => p.id === id) as unknown as T;
        }
        return storage.products as unknown as T;
      }
      if (lowerQuery.includes("from sync_queue")) {
        return storage.sync_queue as unknown as T;
      }
      if (lowerQuery.includes("from sales_transactions")) {
        return storage.sales_transactions as unknown as T;
      }
      if (lowerQuery.includes("from sales_items")) {
        if (lowerQuery.includes("where transaction_id =")) {
          const txnId = values[0];
          return storage.sales_items.filter(si => si.transaction_id === txnId) as unknown as T;
        }
        return storage.sales_items as unknown as T;
      }
      if (lowerQuery.includes("from customers")) {
        if (lowerQuery.includes("where id = ?") || lowerQuery.includes("where id =")) {
          const id = values[0];
          return storage.customers.filter(c => c.id === id) as unknown as T;
        }
        return storage.customers as unknown as T;
      }
      if (lowerQuery.includes("from invoices")) {
        if (lowerQuery.includes("where id =")) {
          const id = values[0];
          return storage.invoices.filter(i => i.id === id) as unknown as T;
        }
        return storage.invoices as unknown as T;
      }
      if (lowerQuery.includes("from invoice_items")) {
        if (lowerQuery.includes("where invoice_id =")) {
          const invoice_id = values[0];
          return storage.invoice_items.filter(i => i.invoice_id === invoice_id) as unknown as T;
        }
        return storage.invoice_items as unknown as T;
      }
      if (lowerQuery.includes("from stock_transfers")) {
        return storage.stock_transfers as unknown as T;
      }
      if (lowerQuery.includes("from audit_log")) {
        return storage.audit_log as unknown as T;
      }
      return [] as unknown as T;
    }
  };
}

/**
 * Initializes the SQLite local tables and indexes for the POS app.
 */
async function initializeTables(db: any) {
  // 1. Sync Queue outbox
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      action TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // 2. Local Products table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL,
      reorder_level INTEGER DEFAULT 10,
      sku TEXT,
      category_id TEXT,
      updated_at TEXT NOT NULL
    );
  `);

  // 3. Sales Transactions table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sales_transactions (
      id TEXT PRIMARY KEY,
      transaction_number TEXT UNIQUE NOT NULL,
      customer_id TEXT,
      customer_name TEXT,
      total REAL NOT NULL,
      tax REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      payment_method TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 4. Sales Items table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sales_items (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      name TEXT,
      qty INTEGER NOT NULL,
      price REAL NOT NULL,
      total REAL NOT NULL,
      FOREIGN KEY(transaction_id) REFERENCES sales_transactions(id) ON DELETE CASCADE
    );
  `);

  // Run migrations to update existing schemas if they were already initialized without new columns
  try {
    await db.execute("ALTER TABLE sales_transactions ADD COLUMN customer_name TEXT;");
  } catch (e) {}
  try {
    await db.execute("ALTER TABLE sales_items ADD COLUMN name TEXT;");
  } catch (e) {}
  try {
    await db.execute("ALTER TABLE customers ADD COLUMN outstanding_balance REAL DEFAULT 0;");
  } catch (e) {}
  try {
    await db.execute("ALTER TABLE customers ADD COLUMN loyalty_points INTEGER DEFAULT 0;");
  } catch (e) {}

  // 5. Customers table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      notes TEXT,
      total_spend REAL DEFAULT 0,
      total_orders INTEGER DEFAULT 0,
      last_purchase_at TEXT,
      created_at TEXT NOT NULL,
      outstanding_balance REAL DEFAULT 0,
      loyalty_points INTEGER DEFAULT 0
    );
  `);

  // 6. Invoices table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      number TEXT NOT NULL,
      type TEXT NOT NULL,
      customer_name TEXT,
      customer_address TEXT,
      customer_id TEXT,
      date TEXT,
      notes TEXT,
      service_charge_percent REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft',
      company_id TEXT,
      created_by TEXT,
      attachments TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // 7. Invoice Items table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      description TEXT NOT NULL,
      qty REAL NOT NULL,
      rate REAL NOT NULL,
      inventory_item_id TEXT,
      unit_name TEXT,
      unit_factor REAL DEFAULT 1,
      FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );
  `);

  // 8. Stock Transfers table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS stock_transfers (
      id TEXT PRIMARY KEY,
      transfer_number TEXT NOT NULL,
      from_store_id TEXT,
      to_store_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      items_json TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // 9. Audit Log table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      details TEXT,
      user_name TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Create indexes for performance
  await db.execute("CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_sales_items_txn ON sales_items(transaction_id);");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON sync_queue(created_at);");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_invoice_items_inv ON invoice_items(invoice_id);");
  
  console.log("[SQLite] Local schema verified/initialized successfully.");
}

/**
 * Retrieves the database connection instance, initializing it on the first call.
 */
export async function getDb(): Promise<any> {
  if (dbInstance) return dbInstance;

  if (isTauri()) {
    try {
      // Connect to native SQLite database
      dbInstance = await Database.load("sqlite:pos.db");
      await initializeTables(dbInstance);
      return dbInstance;
    } catch (error) {
      console.error("[SQLite] Error loading Tauri SQLite plugin, falling back to mock database:", error);
    }
  }

  // Fallback to in-memory mock for web browser environment
  dbInstance = createMockDb();
  return dbInstance;
}
