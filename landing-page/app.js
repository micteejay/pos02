document.addEventListener("DOMContentLoaded", () => {
  // Simulator States
  let isOffline = false;
  let cart = [];
  let outboxQueue = [];

  let products = [
    { id: "1", name: "Premium Widget Alpha", price: 29.99, sku: "W-ALPHA-90", stock: 45, warehouse: "A" },
    { id: "2", name: "Wireless Smart Sensor", price: 89.99, sku: "S-SMART-88", stock: 12, warehouse: "B" },
    { id: "3", name: "USB-C Multi-Hub", price: 19.99, sku: "H-USBC-12", stock: 110, warehouse: "A" },
    { id: "4", name: "Smart Bluetooth Keyboard", price: 49.99, sku: "K-BT-40", stock: 24, warehouse: "B" },
    { id: "5", name: "Heavy Duty Power Bank", price: 39.99, sku: "P-BANK-05", stock: 68, warehouse: "A" },
    { id: "6", name: "Magnetic Smart Cover", price: 24.99, sku: "C-MAG-33", stock: 95, warehouse: "B" }
  ];

  let transactionsHistory = [
    { id: "TXN-9012", client: "Walk-in", method: "Cash", total: 59.98, status: "completed", date: new Date().toLocaleTimeString() },
    { id: "TXN-9011", client: "Sarah Campbell", method: "Credit Card", total: 179.98, status: "completed", date: new Date(Date.now() - 3600000).toLocaleTimeString() },
    { id: "TXN-9010", client: "Obinna Anya", method: "Credit Card", total: 89.99, status: "completed", date: new Date(Date.now() - 7200000).toLocaleTimeString() }
  ];

  let purchaseOrders = [
    { id: "PO-4091", supplier: "Zenith Global Corp", total: 1200, status: "approved", approvedBy: "Auto-approved" },
    { id: "PO-4092", supplier: "A1 Logistics & Hardware", total: 6400, status: "pending_review", approvedBy: "Awaiting Manager" }
  ];

  let customers = [
    { name: "Sarah Campbell", email: "sarah@campbell.com", spend: 350.00, points: 35, balance: 40.00 },
    { name: "Obinna Anya", email: "obinna@anya.com", spend: 1240.00, points: 124, balance: 0.00 },
    { name: "John Doe", email: "john@doe.com", spend: 89.99, points: 9, balance: 15.00 }
  ];

  let auditLogs = [
    { id: "AUD-801", user: "Super Admin", action: "System Initialized", time: new Date().toLocaleTimeString(), details: "POS Simulator loaded cleanly" }
  ];

  let selectedPaymentMethod = "Cash";

  // Elements
  const tabButtons = document.querySelectorAll(".nav-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");
  const tabTitle = document.getElementById("current-tab-title");
  const networkSwitch = document.getElementById("network-switch");
  const networkIndicator = document.querySelector(".status-indicator");
  const networkStatusText = document.querySelector(".status-text");

  // --- Tab Switching ---
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab");

      tabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      tabPanes.forEach(pane => pane.classList.remove("active"));
      document.getElementById(`tab-${tabId}`).classList.add("active");

      // Update Header Title
      const titles = {
        dashboard: "Sales Dashboard Overview",
        checkout: "POS Terminal Checkout",
        inventory: "Inventory Management & Stock Levels",
        sales: "Sales Transaction Ledger",
        customers: "Customer Accounts Registry",
        supply: "Supply Chain & Procurement",
        approvals: "Four-Eyes Governance Approvals",
        reports: "Offline Sync & Database Migrator"
      };
      tabTitle.textContent = titles[tabId] || "POS Terminal";

      // Trigger specific tab refreshes
      if (tabId === "dashboard") {
        updateDashboard();
      } else if (tabId === "inventory") {
        renderInventoryTable();
      } else if (tabId === "sales") {
        renderSalesLedger();
      } else if (tabId === "customers") {
        renderCustomersTable();
      } else if (tabId === "supply") {
        renderSupplyPOs();
      } else if (tabId === "approvals") {
        renderApprovalsQueue();
      } else if (tabId === "reports") {
        updateSyncQueue();
      }
    });
  });

  // --- Offline Mode Toggle ---
  networkSwitch.addEventListener("change", (e) => {
    isOffline = e.target.checked;
    if (isOffline) {
      networkIndicator.className = "status-indicator offline";
      networkStatusText.textContent = "Network: Offline (SQLite Cache)";
      logSystemAudit("Network offline", "Switched to SQLite outbox buffered mode");
      showToast("Offline Mode Active! Transactions will queue locally in SQLite outbox.", "warning");
    } else {
      networkIndicator.className = "status-indicator online";
      networkStatusText.textContent = "Network: Connected";
      logSystemAudit("Network restored", "Supabase online connection verified");
      showToast("Online status verified! Sync ready.", "success");
    }
  });

  // --- Audit Log Utility ---
  function logSystemAudit(action, details) {
    const logId = "AUD-" + Math.floor(Math.random() * 900 + 100);
    auditLogs.unshift({
      id: logId,
      user: "Super Admin",
      action: action,
      time: new Date().toLocaleTimeString(),
      details: details
    });
    updateAuditLogsUI();
  }

  function updateAuditLogsUI() {
    const logsContainer = document.getElementById("dash-audit-logs");
    if (!logsContainer) return;

    logsContainer.innerHTML = "";
    auditLogs.slice(0, 5).forEach(log => {
      const item = document.createElement("div");
      item.className = "audit-log-item animate-fade-in";
      item.innerHTML = `
        <span class="text-muted-foreground">[${log.time}]</span>
        <span class="text-foreground font-bold ml-1">${log.action}</span>
        <span class="text-muted-foreground truncate ml-2">${log.details}</span>
      `;
      logsContainer.appendChild(item);
    });
  }

  // --- Dashboard Logic ---
  function updateDashboard() {
    const totalRev = transactionsHistory
      .filter(t => t.status === "completed")
      .reduce((sum, t) => sum + t.total, 0);

    document.getElementById("dash-revenue").textContent = `$${totalRev.toFixed(2)}`;
    document.getElementById("dash-transactions").textContent = transactionsHistory.length;

    const outboxCount = outboxQueue.length;
    document.getElementById("dash-outbox").textContent = `${outboxCount} pending`;

    // Populate history table
    const tableBody = document.getElementById("txn-history-body");
    tableBody.innerHTML = "";
    if (transactionsHistory.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#71717a;padding:2rem;">No transaction logs available.</td></tr>`;
      return;
    }

    transactionsHistory.slice(0, 5).forEach(tx => {
      const tr = document.createElement("tr");
      tr.className = "border-b border-border/40 hover:bg-muted/30";

      const badgeClass = tx.status === "completed" ? "badge bg-emerald-10 text-emerald" : "badge bg-warning-10 text-warning";

      tr.innerHTML = `
        <td class="py-2 font-mono text-primary">${tx.id}</td>
        <td class="py-2 font-medium">${tx.client}</td>
        <td class="py-2 text-muted-foreground">${tx.method}</td>
        <td class="py-2 text-right font-semibold">$${tx.total.toFixed(2)}</td>
        <td class="py-2 text-center"><span class="${badgeClass}" style="padding:0.15rem 0.5rem;font-size:9px;">${tx.status}</span></td>
      `;
      tableBody.appendChild(tr);
    });

    updateAuditLogsUI();
    updateOutboxBadges();
  }

  function updateOutboxBadges() {
    const outboxCount = outboxQueue.length;
    const approvalsBadge = document.querySelector(".approvals-badge");
    const pendingApprovalsCount = purchaseOrders.filter(p => p.status === "pending_review").length;

    if (pendingApprovalsCount > 0) {
      approvalsBadge.textContent = pendingApprovalsCount;
      approvalsBadge.classList.remove("hidden");
    } else {
      approvalsBadge.classList.add("hidden");
    }
  }

  // --- POS Checkout Terminal Logic ---
  const catalogGrid = document.getElementById("catalog-items-grid");
  const cartList = document.getElementById("cart-items-list");
  const cartTotalText = document.getElementById("cart-total");
  const btnCompleteSale = document.getElementById("btn-complete-sale");
  const clearCartBtn = document.getElementById("clear-cart-btn");
  const posSearchInput = document.getElementById("pos-search-input");

  const btnPayCash = document.getElementById("btn-pay-cash");
  const btnPayCard = document.getElementById("btn-pay-card");

  btnPayCash.addEventListener("click", () => {
    selectedPaymentMethod = "Cash";
    btnPayCash.className = "px-2.5 py-1 rounded border bg-card border-primary text-primary";
    btnPayCard.className = "px-2.5 py-1 rounded border bg-card";
  });

  btnPayCard.addEventListener("click", () => {
    selectedPaymentMethod = "Credit Card";
    btnPayCard.className = "px-2.5 py-1 rounded border bg-card border-primary text-primary";
    btnPayCash.className = "px-2.5 py-1 rounded border bg-card";
  });

  // Render product catalog with filtering
  function renderCatalog(filterText = "") {
    catalogGrid.innerHTML = "";
    const q = filterText.toLowerCase().trim();

    const filtered = products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));

    if (filtered.length === 0) {
      catalogGrid.innerHTML = `<p class="text-xs text-muted-foreground text-center py-8 col-span-3">No matching items.</p>`;
      return;
    }

    filtered.forEach(p => {
      const card = document.createElement("button");
      card.className = "catalog-item-btn flex flex-col justify-between h-28";
      card.innerHTML = `
        <div class="flex items-center justify-between w-full">
          <div class="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">${p.name.charAt(0)}</div>
          <span class="text-[10px] text-muted-foreground font-semibold">$${p.price}</span>
        </div>
        <p class="text-[10px] font-bold text-foreground leading-tight text-left mt-2">${p.name}</p>
        <span class="text-[9px] text-muted-foreground/60 mt-1 block">Stock: ${p.stock} units</span>
      `;
      card.addEventListener("click", () => addToCart(p));
      catalogGrid.appendChild(card);
    });
  }

  posSearchInput.addEventListener("input", (e) => {
    renderCatalog(e.target.value);
  });

  function addToCart(p) {
    if (p.stock <= 0) {
      showToast("Cannot add item: stock level is 0.", "error");
      return;
    }
    const existing = cart.find(item => item.id === p.id);
    if (existing) {
      if (existing.qty >= p.stock) {
        showToast("Cannot add more: exceeds active inventory stock.", "error");
        return;
      }
      existing.qty += 1;
    } else {
      cart.push({ ...p, qty: 1 });
    }
    renderCart();
  }

  function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    renderCart();
  }

  function renderCart() {
    cartList.innerHTML = "";
    if (cart.length === 0) {
      cartList.innerHTML = `
        <div class="text-center py-8 text-muted-foreground text-xs flex flex-col items-center gap-2">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
          Your shopping cart is empty.
        </div>
      `;
      cartTotalText.textContent = "$0.00";
      btnCompleteSale.disabled = true;
      clearCartBtn.classList.add("hidden");
      return;
    }

    clearCartBtn.classList.remove("hidden");
    let total = 0;
    cart.forEach(item => {
      total += item.price * item.qty;
      const row = document.createElement("div");
      row.className = "cart-item-row text-[11px] animate-fade-in";
      row.innerHTML = `
        <div>
          <span class="font-semibold text-foreground">${item.name}</span>
          <p class="text-muted-foreground text-[9px] mt-0.5">$${item.price} · Qty: ${item.qty}</p>
        </div>
        <button class="p-1 rounded text-destructive hover:bg-destructive/10 remove-item-btn" data-id="${item.id}">
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      `;
      row.querySelector(".remove-item-btn").addEventListener("click", () => removeFromCart(item.id));
      cartList.appendChild(row);
    });

    cartTotalText.textContent = `$${total.toFixed(2)}`;
    btnCompleteSale.disabled = false;
  }

  clearCartBtn.addEventListener("click", () => {
    cart = [];
    renderCart();
  });

  // Complete checkout action
  btnCompleteSale.addEventListener("click", () => {
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const txnNum = "TXN-" + Math.floor(Math.random() * 9000 + 1000);

    // Subtract stock levels
    cart.forEach(cartItem => {
      products = products.map(p => {
        if (p.id === cartItem.id) {
          return { ...p, stock: p.stock - cartItem.qty };
        }
        return p;
      });
    });

    const newTxn = {
      id: txnNum,
      client: "Walk-in",
      method: selectedPaymentMethod,
      total: total,
      status: isOffline ? "offline_cache" : "completed",
      date: new Date().toLocaleTimeString()
    };

    if (isOffline) {
      outboxQueue.push(newTxn);
      logSystemAudit("Sale cached offline", `Saved transaction ${txnNum} locally to SQLite outbox`);
      showToast(`Sale cached offline in SQLite outbox: ${txnNum}`, "warning");
    } else {
      transactionsHistory.unshift(newTxn);
      logSystemAudit("POS Sale Completed", `Checkout finished for ${txnNum} (${selectedPaymentMethod})`);
      showToast(`Checkout completed successfully: ${txnNum}`, "success");
    }

    cart = [];
    renderCart();
    renderCatalog();
    updateDashboard();
  });

  // --- Inventory Management Logic ---
  const invSearchInput = document.getElementById("inv-search-input");

  function renderInventoryTable(filterText = "") {
    const tableBody = document.getElementById("inventory-table-body");
    tableBody.innerHTML = "";
    const q = filterText.toLowerCase().trim();

    const filtered = products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));

    if (filtered.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#71717a;padding:2rem;">No inventory records match query.</td></tr>`;
      return;
    }

    filtered.forEach(p => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-muted/20 border-b border-border/40 transition-colors";

      let stockColorClass = "text-foreground";
      if (p.stock === 0) stockColorClass = "text-destructive font-bold";
      else if (p.stock < 15) stockColorClass = "text-warning font-bold";

      tr.innerHTML = `
        <td class="py-2.5 font-semibold text-foreground">${p.name}</td>
        <td class="py-2.5 font-mono text-muted-foreground">${p.sku}</td>
        <td class="py-2.5 text-right font-semibold">$${p.price}</td>
        <td class="py-2.5 text-center ${stockColorClass}">${p.stock} units</td>
        <td class="py-2.5 text-center font-mono text-muted-foreground">${p.warehouse}</td>
        <td class="py-2.5 text-right">
          <button class="px-2 py-0.5 rounded border border-border bg-card text-[10px] hover:border-primary hover:text-primary transition-colors btn-adjust-stock" data-id="${p.id}">
            + Adjust Stock
          </button>
        </td>
      `;

      tr.querySelector(".btn-adjust-stock").addEventListener("click", () => {
        adjustStock(p.id);
      });

      tableBody.appendChild(tr);
    });
  }

  function adjustStock(id) {
    products = products.map(p => {
      if (p.id === id) {
        const adjustedStock = p.stock + 10;
        logSystemAudit("Stock Adjusted", `Adjusted ${p.name} (+10 units)`);
        showToast(`Adjusted inventory stock level for ${p.name} to ${adjustedStock} units!`, "success");
        return { ...p, stock: adjustedStock };
      }
      return p;
    });
    renderInventoryTable(invSearchInput.value);
  }

  invSearchInput.addEventListener("input", (e) => {
    renderInventoryTable(e.target.value);
  });

  // --- Sales Transactions Tab ---
  function renderSalesLedger() {
    const listContainer = document.getElementById("sales-ledger-list");
    listContainer.innerHTML = "";

    transactionsHistory.forEach(tx => {
      const card = document.createElement("div");
      card.className = "p-3 rounded-lg border bg-card/60 flex items-center justify-between";
      card.innerHTML = `
        <div>
          <span class="font-mono text-xs font-bold text-primary">${tx.id}</span>
          <div class="flex items-center gap-2 mt-0.5 text-[9px] text-muted-foreground">
            <span>${tx.date}</span>
            <span>•</span>
            <span>Client: ${tx.client}</span>
          </div>
        </div>
        <div class="text-right">
          <span class="text-xs font-bold text-foreground">$${tx.total.toFixed(2)}</span>
          <span class="text-[9px] text-muted-foreground block">${tx.method}</span>
        </div>
      `;
      listContainer.appendChild(card);
    });

    // Recompute percentage breakdown
    const cashCount = transactionsHistory.filter(t => t.method === "Cash").length;
    const cardCount = transactionsHistory.filter(t => t.method === "Credit Card").length;
    const total = transactionsHistory.length;

    const cashPercent = total > 0 ? Math.round((cashCount / total) * 100) : 60;
    const cardPercent = total > 0 ? Math.round((cardCount / total) * 100) : 40;

    document.getElementById("stat-cash-percent").textContent = `${cashPercent}%`;
    document.getElementById("stat-card-percent").textContent = `${cardPercent}%`;

    document.getElementById("progress-cash").style.width = `${cashPercent}%`;
    document.getElementById("progress-card").style.width = `${cardPercent}%`;
  }

  // --- Customers Tab ---
  function renderCustomersTable() {
    const tableBody = document.getElementById("customers-table-body");
    tableBody.innerHTML = "";

    customers.forEach((c, idx) => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-muted/20 border-b border-border/40 transition-colors";

      const balClass = c.balance > 0 ? "text-warning font-bold" : "text-muted-foreground";
      const actionHtml = c.balance > 0
        ? `<button class="px-2 py-0.5 rounded border bg-card border-primary text-primary text-[10px] btn-pay-balance" data-index="${idx}">Record Payment</button>`
        : `<span class="text-[9px] text-muted-foreground italic">Cleared</span>`;

      tr.innerHTML = `
        <td class="py-2.5 font-semibold text-foreground">${c.name}</td>
        <td class="py-2.5 text-muted-foreground font-mono">${c.email}</td>
        <td class="py-2.5 text-right font-semibold">$${c.spend.toFixed(2)}</td>
        <td class="py-2.5 text-center font-bold text-primary">${c.points} pts</td>
        <td class="py-2.5 text-right ${balClass}">$${c.balance.toFixed(2)}</td>
        <td class="py-2.5 text-right">${actionHtml}</td>
      `;

      if (c.balance > 0) {
        tr.querySelector(".btn-pay-balance").addEventListener("click", () => {
          recordCustomerPayment(idx);
        });
      }

      tableBody.appendChild(tr);
    });
  }

  function recordCustomerPayment(index) {
    const c = customers[index];
    logSystemAudit("Client Account Payment", `Cleared outstanding account balance of $${c.balance.toFixed(2)} for ${c.name}`);
    showToast(`Recorded balance payment of $${c.balance.toFixed(2)} for ${c.name}! Account balance is now $0.00.`, "success");

    customers[index].spend += c.balance;
    customers[index].balance = 0;
    renderCustomersTable();
  }

  // --- Supply Chain Tab ---
  const btnSubmitPo = document.getElementById("btn-submit-po");

  function renderSupplyPOs() {
    const list = document.getElementById("supply-po-list");
    list.innerHTML = "";

    purchaseOrders.forEach(po => {
      const card = document.createElement("div");
      card.className = "p-3 rounded-lg border bg-card/60 flex items-center justify-between";

      let badgeClass = "badge bg-emerald-10 text-emerald";
      let lbl = "Approved";

      if (po.status === "pending_review") {
        badgeClass = "badge bg-warning-10 text-warning";
        lbl = "Awaiting Manager";
      } else if (po.status === "rejected") {
        badgeClass = "badge bg-destructive/10 text-destructive";
        lbl = "Rejected";
      }

      card.innerHTML = `
        <div>
          <span class="font-mono text-xs font-bold text-primary">${po.id}</span>
          <p class="text-[9px] text-muted-foreground mt-0.5">${po.supplier}</p>
        </div>
        <div class="text-right">
          <span class="text-xs font-bold text-foreground">$${po.total}</span>
          <span class="block text-[9px] mt-1"><span class="${badgeClass}">${lbl}</span></span>
        </div>
      `;
      list.appendChild(card);
    });
  }

  btnSubmitPo.addEventListener("click", () => {
    const amountInput = document.getElementById("po-amount");
    const supplierInput = document.getElementById("po-supplier");
    const amount = Number(amountInput.value) || 0;

    if (amount <= 0) {
      showToast("Please enter a valid purchase order amount.", "warning");
      return;
    }

    const poId = "PO-" + Math.floor(Math.random() * 9000 + 1000);
    const newPO = {
      id: poId,
      supplier: supplierInput.value,
      total: amount,
      status: amount >= 5000 ? "pending_review" : "approved",
      approvedBy: amount >= 5000 ? "Awaiting Manager" : "Auto-approved"
    };

    purchaseOrders.unshift(newPO);
    logSystemAudit("Purchase Order Created", `Generated PO ${poId} value $${amount} for ${supplierInput.value}`);
    showToast(`Purchase Order created: ${poId}`, "success");

    amountInput.value = "1200";
    renderSupplyPOs();
    updateOutboxBadges();
  });

  // --- Governance & Approvals Portal ---
  const approverRole = document.getElementById("approver-role-select");
  const poListContainer = document.getElementById("po-list-container");

  function renderApprovalsQueue() {
    poListContainer.innerHTML = "";
    const activeRole = approverRole.value;

    const pendingPOs = purchaseOrders.filter(p => p.status === "pending_review");

    if (pendingPOs.length === 0) {
      poListContainer.innerHTML = `<p class="text-xs text-muted-foreground italic text-center py-6">No pending purchase order requests require review.</p>`;
      return;
    }

    pendingPOs.forEach(po => {
      const card = document.createElement("div");
      card.className = "p-3 rounded-xl border bg-card/60 flex flex-col justify-between gap-3 animate-fade-in";

      let actionsHtml = "";
      if (activeRole === "manager") {
        actionsHtml = `
          <div class="flex gap-2 justify-end">
            <button class="px-2.5 py-1 rounded bg-destructive/10 text-destructive text-[10px] font-bold hover:bg-destructive/20 btn-reject-po" data-id="${po.id}">Reject PO</button>
            <button class="px-2.5 py-1 rounded bg-success/15 text-success text-[10px] font-bold hover:bg-success/25 btn-approve-po" data-id="${po.id}">Approve PO</button>
          </div>
        `;
      } else {
        actionsHtml = `<p class="text-[9px] text-muted-foreground italic">Review options hidden. Switch role select dropdown to 'Manager' to audit.</p>`;
      }

      card.innerHTML = `
        <div class="flex justify-between items-start border-b border-border/20 pb-2">
          <div>
            <span class="font-mono text-xs text-primary font-bold">${po.id}</span>
            <p class="text-[10px] text-muted-foreground mt-0.5">Supplier: ${po.supplier}</p>
          </div>
          <div class="text-right">
            <span class="font-bold text-xs">$${po.total}</span>
            <p class="text-[9px] text-warning font-semibold mt-0.5">Threshold review triggered</p>
          </div>
        </div>
        ${actionsHtml}
      `;

      if (activeRole === "manager") {
        card.querySelector(".btn-approve-po").addEventListener("click", () => approvePO(po.id));
        card.querySelector(".btn-reject-po").addEventListener("click", () => rejectPO(po.id));
      }

      poListContainer.appendChild(card);
    });
  }

  function approvePO(id) {
    purchaseOrders = purchaseOrders.map(po => {
      if (po.id === id) {
        logSystemAudit("Governance PO Approved", `Manager approved purchase order ${id}`);
        return { ...po, status: "approved", approvedBy: "Approved by Manager" };
      }
      return po;
    });
    showToast(`PO ${id} approved successfully!`, "success");
    renderApprovalsQueue();
    updateOutboxBadges();
  }

  function rejectPO(id) {
    purchaseOrders = purchaseOrders.map(po => {
      if (po.id === id) {
        logSystemAudit("Governance PO Rejected", `Manager rejected purchase order ${id}`);
        return { ...po, status: "rejected", approvedBy: "Rejected by Manager" };
      }
      return po;
    });
    showToast(`PO ${id} rejected.`, "warning");
    renderApprovalsQueue();
    updateOutboxBadges();
  }

  approverRole.addEventListener("change", renderApprovalsQueue);

  // --- Sync Engine Simulator ---
  const btnSyncNow = document.getElementById("btn-sync-now");
  const syncIcon = document.getElementById("sync-icon");
  const syncTitle = document.getElementById("sync-status-title");
  const syncDesc = document.getElementById("sync-status-desc");

  function updateSyncQueue() {
    const queueList = document.getElementById("sync-queue-list");
    const queueCount = document.getElementById("sync-queue-count");

    const outboxCount = outboxQueue.length;
    queueCount.textContent = `${outboxCount} pending`;

    if (outboxCount === 0) {
      queueList.innerHTML = `<p class="text-muted-foreground italic text-center py-2">Queue is empty.</p>`;
      btnSyncNow.classList.add("hidden");
      syncTitle.textContent = "Sync Status: Connected";
      syncDesc.textContent = "Local SQLite outbox matches cloud storage database.";
      syncIcon.className = "text-primary";
      return;
    }

    btnSyncNow.classList.remove("hidden");
    syncTitle.textContent = "Sync Status: Unsynced Cache";
    syncDesc.textContent = `${outboxCount} buffered rows queued in SQLite cache. Click commit now.`;
    syncIcon.className = "text-warning animate-pulse";

    queueList.innerHTML = "";
    outboxQueue.forEach(item => {
      const q = document.createElement("div");
      q.className = "p-2 rounded border bg-card/60 flex justify-between items-center";
      q.innerHTML = `
        <div>
          <span class="font-mono text-primary font-bold">${item.id}</span>
          <span class="text-muted-foreground text-[9px] ml-2">${item.date}</span>
        </div>
        <span class="font-bold text-foreground">$${item.total.toFixed(2)}</span>
      `;
      queueList.appendChild(q);
    });
  }

  btnSyncNow.addEventListener("click", () => {
    // Run mock synchronization upload animation
    btnSyncNow.disabled = true;
    btnSyncNow.textContent = "Uploading SQLite outbox cache...";
    syncIcon.className = "text-primary animate-spin-slow";

    setTimeout(() => {
      // Commit queued transactions
      outboxQueue.forEach(txn => {
        txn.status = "completed";
        transactionsHistory.unshift(txn);
      });

      const count = outboxQueue.length;
      outboxQueue = [];

      btnSyncNow.disabled = false;
      btnSyncNow.textContent = "Commit SQLite Outbox Queue";

      logSystemAudit("SQLite Outbox Synced", `Uploaded ${count} offline checkout sales rows to Cloud database`);
      showToast("Tauri Sync Engine committed outbox rows successfully!", "success");
      updateDashboard();
      updateSyncQueue();
    }, 1200);
  });

  // --- Data Migrator & Backups ---
  const btnExportBackup = document.getElementById("btn-export-backup");
  const fileDropArea = document.getElementById("file-drop-area");
  const btnTriggerRestore = document.getElementById("btn-trigger-restore");
  let simulatedUploadedFile = null;

  btnExportBackup.addEventListener("click", () => {
    // Generate simulated download file
    const manifest = {
      company_name: "Simulated Retail Inc",
      exported_at: new Date().toISOString(),
      schema_version: "2026.06",
      row_counts: {
        company_profiles: 1,
        roles: 3,
        inventory_items: products.length,
        sales_transactions: transactionsHistory.length
      }
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(manifest, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "company_backup.vitepbak");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    logSystemAudit("Manifest Backup Export", "Exported company_backup.vitepbak database state");
    showToast("Downloaded company_backup.vitepbak backup manifest!", "success");
  });

  // Simulated File Upload
  fileDropArea.addEventListener("click", () => {
    fileDropArea.classList.add("active");
    setTimeout(() => {
      simulatedUploadedFile = {
        name: "company_backup.vitepbak",
        size: "3.2 KB",
        manifest: {
          company_name: "Offline Outlet",
          exported_at: new Date().toISOString()
        }
      };
      fileDropArea.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" class="text-success mx-auto mb-1.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
        <p class="text-[10px] font-semibold text-foreground leading-none">Loaded: company_backup.vitepbak</p>
        <p class="text-[9px] text-muted-foreground mt-1">Ready to restore company: Offline Outlet</p>
      `;
      btnTriggerRestore.disabled = false;
      showToast("Backup file loaded. Ready to run migrator.", "success");
    }, 600);
  });

  btnTriggerRestore.addEventListener("click", () => {
    if (!simulatedUploadedFile) return;

    btnTriggerRestore.disabled = true;
    btnTriggerRestore.textContent = "Initiating database restore & mapping constraints...";

    setTimeout(() => {
      // Simulate mapping and suffixing categories / SKUs
      const suffix = Math.floor(Math.random() * 9000 + 1000).toString(36).toUpperCase();

      // Inject some mock sales items suffixing them
      const importedTxns = [
        { id: `TXN-5011-${suffix}`, client: `Sarah Campbell-${suffix}`, method: "Cash", total: 45.00, status: "completed", date: new Date().toLocaleTimeString() }
      ];
      transactionsHistory = [...importedTxns, ...transactionsHistory];

      btnTriggerRestore.disabled = false;
      btnTriggerRestore.textContent = "Initiate Database Migration";

      // Reset drop area
      fileDropArea.classList.remove("active");
      fileDropArea.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" class="text-muted-foreground mx-auto mb-1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
        <p class="text-[10px] font-semibold text-foreground leading-none">Click to upload backup file</p>
        <p class="text-[9px] text-muted-foreground mt-1">company_backup.vitepbak</p>
      `;

      logSystemAudit("Backup Restored Successfully", `Migrated tables cleanly. Suffix -${suffix} applied to keys.`);
      showToast(`Data restored successfully under session suffix -${suffix}!`, "success");

      updateDashboard();

      // Navigate back to dashboard tab
      document.querySelector('[data-tab="dashboard"]').click();
    }, 1500);
  });

  // --- Toast Banner Utility ---
  function showToast(message, type = "success") {
    const existing = document.querySelector(".toast-notification");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = `toast-notification animate-slide-down ${type}`;

    let color = "var(--primary)";
    if (type === "warning") color = "var(--warning)";
    else if (type === "error") color = "var(--destructive)";

    toast.style.cssText = `
      position: fixed;
      top: 1.5rem;
      left: 50%;
      transform: translateX(-50%);
      background-color: var(--card);
      border: 1px solid ${color};
      color: var(--foreground);
      padding: 0.65rem 1.25rem;
      border-radius: 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
      z-index: 9999;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      max-width: 90%;
      text-align: center;
    `;

    toast.innerHTML = `
      <span style="display:inline-block;width:0.45rem;height:0.45rem;border-radius:50%;background-color:${color};"></span>
      ${message}
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // Account Request Form handler
  let submissionTarget = "email";

  const btnEmail = document.getElementById("btn-submit-email");
  const btnWhatsapp = document.getElementById("btn-submit-whatsapp");

  if (btnEmail) {
    btnEmail.addEventListener("click", () => {
      submissionTarget = "email";
    });
  }
  if (btnWhatsapp) {
    btnWhatsapp.addEventListener("click", () => {
      submissionTarget = "whatsapp";
    });
  }

  const requestForm = document.getElementById("account-request-form");
  if (requestForm) {
    requestForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = document.getElementById("req-name").value;
      const company = document.getElementById("req-company").value;
      const phone = document.getElementById("req-phone").value;
      const tier = document.getElementById("req-tier").value;
      const message = document.getElementById("req-message").value || "No additional comments";

      if (submissionTarget === "email") {
        const emailRecipient = "vitaposdev@gmail.com";
        const subject = encodeURIComponent(`VitePOS Registration Inquiry - ${company}`);
        const body = encodeURIComponent(
          `Hello VitePOS Team,\n\n` +
          `I would like to inquire about registering an account on VitePOS.\n\n` +
          `--- Inquiry Details ---\n` +
          `Full Name: ${name}\n` +
          `Company Name: ${company}\n` +
          `Phone Number: ${phone}\n` +
          `Interested Plan/Tier: ${tier}\n` +
          `Additional Requirements: ${message}\n\n` +
          `Please guide me on the next onboarding steps.\n\n` +
          `Best regards,\n` +
          `${name}`
        );

        window.location.href = `mailto:${emailRecipient}?subject=${subject}&body=${body}`;
        showToast("Email client opened! Send inquiry to complete request.", "success");
      } else {
        const waText = encodeURIComponent(
          `*VitePOS Registration Inquiry*\n\n` +
          `*Full Name:* ${name}\n` +
          `*Company:* ${company}\n` +
          `*Phone:* ${phone}\n` +
          `*Plan/Tier:* ${tier}\n` +
          `*Message:* ${message}`
        );

        window.open(`https://wa.me/2349122984661?text=${waText}`, "_blank");
        showToast("WhatsApp app opened! Message drafted successfully.", "success");
      }
    });
  }

  // Sync plan buttons with tier select dropdown
  const selectPlanBtns = document.querySelectorAll(".select-plan-btn");
  selectPlanBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const plan = btn.getAttribute("data-plan");
      const tierSelect = document.getElementById("req-tier");
      if (tierSelect) {
        tierSelect.value = plan;
      }
    });
  });

  // Initial runs
  updateDashboard();
  renderCatalog();
  renderCart();
});
