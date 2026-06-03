import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useAppEvents } from "@/hooks/use-app-events";
import { useSharedData, type ItemUnit, type InventoryItem } from "@/hooks/use-shared-data";
import { useAuth } from "@/hooks/use-auth";
import { useCustomers } from "@/hooks/use-customers";
import CustomerPicker from "@/components/CustomerPicker";
import { printNode, printText } from "@/lib/print";
import { generateReceiptText } from "@/lib/receipt-text";
import ReceiptTemplate, { type ReceiptData } from "@/components/ReceiptTemplate";
import BarcodeScanner from "@/components/BarcodeScanner";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { toast } from "sonner";
import PaymentDialog, { type PaymentLine } from "@/components/PaymentDialog";
import CustomerDetailDialog from "@/components/CustomerDetailDialog";
import {
  Search, Plus, Minus, X, ShoppingCart, CreditCard, Banknote, Smartphone,
  Trash2, Receipt, Barcode, Tag, Check, Package, Percent, DollarSign, Printer,
  Pencil, User,
} from "lucide-react";

interface CartItem {
  /** Unique line key = sku + unit name */
  lineKey: string;
  sku: string;
  name: string;
  /** Price per 1 of `unitName` */
  price: number;
  /** Number of selling units (e.g. 2 boxes) */
  qty: number;
  discount: number;
  /** Stock remaining in BASE units */
  stock: number;
  /** Selling unit name (e.g. "pcs", "Box", "Carton") */
  unitName: string;
  /** Base units per 1 selling unit */
  unitFactor: number;
}

const defaultCategories = ["All"];
const paymentMethods = [
  { id: "card", label: "Credit Card", icon: CreditCard },
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "mobile", label: "Mobile Pay", icon: Smartphone },
];

export default function POSPage() {
  const { formatCurrency, formatDateTime, settings } = useAppSettings();
  const { addApprovalItem, addNotification } = useAppEvents();
  const { inventory, adjustInventoryQty, addSale, storeNames } = useSharedData();
  const { customers, findOrCreate } = useCustomers();
  const { companyProfile } = useAuth();
  const { user } = useAuth();
  const receiptRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const activeStore = storeNames[0] || "Default Store";
  const categories = useMemo(() => {
    const cats = [...new Set(inventory.map(i => i.category))];
    return ["All", ...cats];
  }, [inventory]);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("pos_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync cart to localStorage
  useEffect(() => {
    localStorage.setItem("pos_cart", JSON.stringify(cart));
  }, [cart]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(settings.defaultPaymentMethod || "cash");

  useEffect(() => {
    setPaymentMethod(settings.defaultPaymentMethod || "cash");
  }, [settings.defaultPaymentMethod]);
  const [completedSale, setCompletedSale] = useState<{ id: string; total: number; subtotal: number; tax: number; discount: number; items: CartItem[]; customer: string; method: string; date?: string } | null>(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [heldOrders, setHeldOrders] = useState<{ id: string; cart: CartItem[]; customer: string }[]>([]);
  const [showHeld, setShowHeld] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [editingPriceKey, setEditingPriceKey] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>("");
  const [showPayment, setShowPayment] = useState(false);
  const [showCustomerDetail, setShowCustomerDetail] = useState(false);

  const handlePriceSave = useCallback((lineKey: string) => {
    const parsedPrice = parseFloat(tempPrice);
    if (!isNaN(parsedPrice) && parsedPrice >= 0) {
      setCart((prev) => prev.map(i => i.lineKey === lineKey ? { ...i, price: parsedPrice } : i));
      toast.success("Price updated in cart");
    }
    setEditingPriceKey(null);
  }, [tempPrice]);

  // Auto-focus search input on mount and keep it focused
  useEffect(() => {
    searchInputRef.current?.focus();
    
    // Global listener to re-focus search input if user clicks away on the background
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive = 
        target.tagName === "INPUT" || 
        target.tagName === "TEXTAREA" || 
        target.tagName === "BUTTON" || 
        target.tagName === "A" || 
        target.closest("button") || 
        target.closest("a") ||
        target.closest("[role='dialog']") ||
        target.isContentEditable;
        
      if (!isInteractive) {
        searchInputRef.current?.focus();
      }
    };
    
    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, []);

  /**
   * Add an item to the cart in a specific unit. Defaults to the item's base unit.
   */
  const addToCart = useCallback((item: InventoryItem, unit?: ItemUnit) => {
    const unitName = unit?.name || item.baseUnit || "pcs";
    const unitFactor = unit?.factor || 1;
    const price = unit?.price ?? item.price;
    const lineKey = `${item.sku}::${unitName}`;
    setCart((prev) => {
      const existing = prev.find((i) => i.lineKey === lineKey);
      // total base units already in cart for this sku across all unit lines
      const baseInCart = prev.filter(i => i.sku === item.sku).reduce((s, i) => s + i.qty * i.unitFactor, 0);
      if (!settings.allowNegativeStock && baseInCart + unitFactor > item.qty) {
        toast.error(`Not enough stock (${item.qty} ${item.baseUnit || "pcs"} available)`);
        return prev;
      }
      if (existing) {
        return [{ ...existing, qty: existing.qty + 1 }, ...prev.filter((i) => i.lineKey !== lineKey)];
      }
      return [{ lineKey, sku: item.sku, name: item.name, price, qty: 1, discount: 0, stock: item.qty, unitName, unitFactor }, ...prev];
    });
    // Ensure search input is focused after adding an item so successive scans work
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [settings.allowNegativeStock]);

  const handleBarcodeScan = useCallback((barcode: string) => {
    const item = inventory.find(p => p.barcode === barcode || p.sku === barcode);
    if (item) {
      addToCart(item);
      toast.success(`Added ${item.name} to cart`);
    } else {
      toast.error("Product not found for barcode: " + barcode);
    }
  }, [inventory, addToCart]);

  // Auto-detect USB/Bluetooth barcode scanners globally when no inputs are focused
  useBarcodeScanner(handleBarcodeScan, !showScanner);

  const filteredProducts = useMemo(() => {
    return inventory.filter((p) => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()) || (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()));
      const matchCategory = category === "All" || p.category === category;
      return matchSearch && matchCategory;
    });
  }, [search, category, inventory]);

  // Handle barcode scanner Enter keystroke on the search input itself
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const query = search.trim();
      if (!query) return;

      // Find exact match by barcode or SKU
      const matchedItem = inventory.find(
        (p) => (p.barcode && p.barcode.toLowerCase() === query.toLowerCase()) || 
               p.sku.toLowerCase() === query.toLowerCase()
      );

      if (matchedItem) {
        e.preventDefault();
        addToCart(matchedItem);
        setSearch("");
        toast.success(`Added ${matchedItem.name} to cart`);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      } else {
        // Fallback: if there is exactly 1 filtered product matching the search, add it
        if (filteredProducts.length === 1) {
          e.preventDefault();
          addToCart(filteredProducts[0]);
          setSearch("");
          toast.success(`Added ${filteredProducts[0].name} to cart`);
          setTimeout(() => searchInputRef.current?.focus(), 50);
        }
      }
    }
  }, [search, inventory, addToCart, filteredProducts]);




  const updateQty = useCallback((lineKey: string, delta: number) => {
    setCart((prev) => {
      const line = prev.find(i => i.lineKey === lineKey);
      if (!line) return prev;
      const newQty = line.qty + delta;
      if (newQty <= 0) return prev.filter(i => i.lineKey !== lineKey);
      const baseInCart = prev.filter(i => i.sku === line.sku && i.lineKey !== lineKey)
        .reduce((s, i) => s + i.qty * i.unitFactor, 0);
      if (!settings.allowNegativeStock && baseInCart + newQty * line.unitFactor > line.stock) {
        toast.error(`Not enough stock`);
        return prev;
      }
      return prev.map(i => i.lineKey === lineKey ? { ...i, qty: newQty } : i);
    });
  }, [settings.allowNegativeStock]);

  const removeFromCart = useCallback((lineKey: string) => {
    setCart((prev) => prev.filter((i) => i.lineKey !== lineKey));
  }, []);

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty * (1 - i.discount / 100), 0), [cart]);
  const discountAmount = subtotal * (discountPercent / 100);
  const tax = (subtotal - discountAmount) * (settings.taxRate / 100);
  const total = subtotal - discountAmount + tax;
  const itemCount = cart.reduce((s, i) => s + i.qty, 0);

  const holdOrder = () => {
    if (cart.length === 0) return;
    setHeldOrders(prev => [...prev, { id: `HOLD-${Date.now()}`, cart: [...cart], customer: customerName || "Walk-in" }]);
    setCart([]); setCustomerName(""); setDiscountPercent(0);
  };

  const recallOrder = (id: string) => {
    const order = heldOrders.find(o => o.id === id);
    if (order) { setCart(order.cart); setCustomerName(order.customer); setHeldOrders(prev => prev.filter(o => o.id !== id)); setShowHeld(false); }
  };

  const completeSale = async (paymentResult?: { payments: PaymentLine[]; amountTendered: number; change: number; balanceDue: number }) => {
    // Resolve customer: explicit picker selection wins; otherwise look up / create by name
    let resolvedId = customerId;
    let resolvedName = customerName || "Walk-in";
    let resolvedEmail = customerEmail;
    let resolvedPhone = customerPhone;
    if (!resolvedId && customerName.trim() && customerName.toLowerCase() !== "walk-in") {
      const c = await findOrCreate({ name: customerName, email: customerEmail, phone: customerPhone }).catch(() => null);
      if (c) { resolvedId = c.id; resolvedName = c.name; resolvedEmail = c.email || resolvedEmail; resolvedPhone = c.phone || resolvedPhone; }
    }
    // Deduct from inventory in BASE units (qty × factor)
    cart.forEach(item => {
      adjustInventoryQty(item.sku, -(item.qty * item.unitFactor));
    });

    // Record sale (qty stored in selling units; consumer shows label with unit name)
    const payments = paymentResult?.payments || [];
    const primaryMethod = payments[0]?.method || paymentMethod;
    addSale({
      items: cart.map(i => ({
        name: `${i.name} (${i.unitName})`,
        sku: i.sku,
        qty: i.qty,
        price: i.price,
        unitFactor: i.unitFactor,
        unitName: i.unitName,
        baseQty: i.qty * i.unitFactor,
      })),
      total, customer: resolvedName, method: primaryMethod, store: activeStore,
      createdBy: user?.name || "System", createdByRole: user?.role || "",
      customerId: resolvedId,
      customerEmail: resolvedEmail || null,
      customerPhone: resolvedPhone || null,
      subtotal, tax, discount: discountAmount,
      payments,
      amountTendered: paymentResult?.amountTendered ?? total,
      change: paymentResult?.change ?? 0,
      balanceDue: paymentResult?.balanceDue ?? 0,
    });

    const saleId = `TXN-${9300 + Math.floor(Math.random() * 100)}`;
    const dateStr = formatDateTime(new Date());
    if (total >= settings.requireApprovalAbove) {
      addApprovalItem({
        title: `High-value sale ${saleId}`,
        type: "general",
        sourceId: saleId,
        requester: user?.name || "Cashier",
        department: "Sales",
        amount: total,
        description: `${resolvedName} — ${cart.length} item(s), ${paymentMethod}`,
        priority: "high",
      });
      addNotification({
        type: "sales",
        title: `Sale above ${formatCurrency(settings.requireApprovalAbove)}`,
        message: `${saleId} for ${formatCurrency(total)} requires manager review`,
        link: "/approvals",
        targetRoles: ["Manager", "Admin", "Super Admin"],
      });
      toast.info("High-value sale flagged for manager approval");
    }
    setCompletedSale({
      id: saleId,
      total,
      subtotal,
      tax,
      discount: discountAmount,
      items: [...cart],
      customer: resolvedName,
      method: primaryMethod,
      date: dateStr,
      payments,
      amountTendered: paymentResult?.amountTendered ?? total,
      change: paymentResult?.change ?? 0,
      balanceDue: paymentResult?.balanceDue ?? 0,
    } as any);
    setCart([]); setCustomerName(""); setCustomerId(null); setCustomerEmail(""); setCustomerPhone(""); setDiscountPercent(0);
    setShowPayment(false);
    // Queue focus re-activation
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  return (
    <AppLayout>
      <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-3.5rem)] -mx-4 -mb-4 -mt-2 sm:-mx-6 sm:-mb-6 sm:-mt-6 lg:-mx-8 lg:-mb-8 lg:-mt-2 gap-0">
        <div className="flex-1 flex flex-col min-w-0 border-r border-border">
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">Point of Sale</h1>
              <div className="flex items-center gap-3">
                {heldOrders.length > 0 && (
                  <button onClick={() => setShowHeld(!showHeld)} className="text-xs text-warning font-medium px-2 py-1 rounded-lg bg-warning/10 hover:bg-warning/20">{heldOrders.length} held</button>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><div className="w-2 h-2 rounded-full bg-success animate-pulse" />Store: {activeStore}</div>
              </div>
            </div>
            {showHeld && (
              <div className="space-y-1.5 animate-fade-in">
                {heldOrders.map(o => (
                  <button key={o.id} onClick={() => recallOrder(o.id)} className="w-full flex items-center justify-between p-2 rounded-lg bg-warning/5 border border-warning/20 text-xs hover:bg-warning/10">
                    <span className="text-foreground font-medium">{o.customer}</span>
                    <span className="text-muted-foreground">{o.cart.length} items</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                <Input ref={searchInputRef} value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={handleSearchKeyDown} placeholder="Search products or scan barcode..." className="pl-11 h-12 text-sm rounded-xl border-border/50 bg-background/45 backdrop-blur-md shadow-inner hover:border-primary/30 focus-visible:ring-primary/15 focus-visible:border-primary transition-all duration-300" />
              </div>
              <button onClick={() => setShowScanner(true)} className="p-3.5 rounded-xl border border-border/50 bg-background/45 backdrop-blur-md shadow-sm hover:bg-muted/80 hover:border-primary/30 transition-all group active:scale-95">
                <Barcode className="w-4.5 h-4.5 text-muted-foreground/80 group-hover:text-primary transition-colors" />
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2.5 scrollbar-hide pt-1.5 border-b border-border/30">
              {categories.map((c) => (
                <button key={c} onClick={() => setCategory(c)} className={`px-4.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 active:scale-95 ${category === c ? "bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(var(--primary),0.25)] ring-1 ring-primary/20 scale-105" : "bg-muted/40 border border-border/30 text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:scale-105"}`}>{c}</button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-muted/10 animate-fade-in">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((p) => {
                const inCartLines = cart.filter((i) => i.sku === p.sku);
                const totalInCartBase = inCartLines.reduce((s, i) => s + i.qty * i.unitFactor, 0);
                const sellableUnits: ItemUnit[] = [
                  { name: p.baseUnit || "pcs", factor: 1, price: p.price },
                  ...((p.units || []).filter(u => (u.sellable ?? true) && u.name.trim())),
                ];
                return (
                  <div key={p.sku} className={`glass-card rounded-2xl p-4 text-left transition-all duration-300 hover:border-primary/50 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1 relative group overflow-hidden ${totalInCartBase > 0 ? "border-primary/60 bg-primary/[0.03] ring-1 ring-primary/20" : "border-border/40 bg-card/45"} ${p.qty === 0 ? "opacity-45 grayscale" : ""}`}>
                    {totalInCartBase > 0 && <div className="absolute inset-0 bg-primary/[0.02] pointer-events-none animate-pulse-slow" />}
                    <button onClick={() => addToCart(p)} disabled={p.qty === 0} className="w-full text-left relative z-10 outline-none">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors ${totalInCartBase > 0 ? "bg-primary/20" : "bg-muted/50 group-hover:bg-primary/10"}`}>
                        <Package className={`w-6 h-6 transition-colors ${totalInCartBase > 0 ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} />
                      </div>
                      <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{p.sku}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-base font-bold text-primary">{formatCurrency(p.price)}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${p.qty < 15 ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>{p.qty} {p.baseUnit || "pcs"}</span>
                      </div>
                    </button>
                    {sellableUnits.length > 1 && (
                      <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border/30">
                        {sellableUnits.map((u) => (
                          <button
                            key={u.name}
                            disabled={p.qty < u.factor}
                            onClick={(e) => { e.stopPropagation(); addToCart(p, u); }}
                            className="text-[9px] px-2 py-0.5 rounded-full bg-muted/60 hover:bg-primary/15 hover:text-primary text-muted-foreground font-semibold disabled:opacity-40 transition-colors border border-border/30"
                            title={`Sell as ${u.name} (${u.factor} ${p.baseUnit || "pcs"} = ${formatCurrency(u.price)})`}
                          >
                            {u.name} · {formatCurrency(u.price)}
                          </button>
                        ))}
                      </div>
                    )}
                    {totalInCartBase > 0 && <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-lg shadow-primary/30 animate-in zoom-in">{totalInCartBase}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[420px] flex flex-col shrink-0 bg-card/65 backdrop-blur-xl border-l border-border/60 shadow-[0_0_50px_-12px_rgba(0,0,0,0.15)] z-10">
          <div className="p-5 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-foreground">Cart</h2>
                {itemCount > 0 && <span className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full font-bold shadow-md shadow-primary/20">{itemCount}</span>}
              </div>
              <div className="flex items-center gap-3">
                {cart.length > 0 && <button onClick={holdOrder} className="text-xs text-warning hover:text-warning/80 font-medium transition-colors">Hold</button>}
                {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs text-destructive hover:text-destructive/80 font-medium transition-colors">Clear</button>}
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <CustomerPicker
                    compact
                    value={{ id: customerId, name: customerName, email: customerEmail, phone: customerPhone }}
                    onChange={(v) => { setCustomerId(v.id); setCustomerName(v.name); setCustomerEmail(v.email); setCustomerPhone(v.phone); }}
                  />
                </div>
                {customerId && (
                  <button
                    onClick={() => setShowCustomerDetail(true)}
                    className="p-2 rounded-lg border border-border/50 bg-background/50 hover:border-primary/50 hover:bg-primary/5 transition-colors shrink-0"
                    title="View loyalty & payment history"
                  >
                    <User className="w-4 h-4 text-primary" />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground/60 py-20">
                <ShoppingCart className="w-14 h-14 mb-3 opacity-15" />
                <p className="text-sm font-semibold">Your cart is empty</p>
                <p className="text-xs mt-1">Scan a barcode or click products to add items</p>
              </div>
            ) : cart.map((item) => (
              <div key={item.lineKey} className="flex items-center gap-3.5 p-3 rounded-xl bg-card/60 border border-border/30 shadow-sm group hover:border-primary/25 hover:bg-card transition-all duration-300 animate-in slide-in-from-right-2 fade-in">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                  {editingPriceKey === item.lineKey ? (
                    <div className="flex items-center gap-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs text-muted-foreground">{settings.currencySymbol}</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={tempPrice}
                        onChange={(e) => setTempPrice(e.target.value)}
                        onBlur={() => handlePriceSave(item.lineKey)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handlePriceSave(item.lineKey);
                          if (e.key === "Escape") setEditingPriceKey(null);
                        }}
                        className="w-20 h-6 px-1.5 py-0.5 text-xs font-semibold rounded border border-primary bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                        autoFocus
                      />
                      <span className="text-xs text-muted-foreground">/ {item.unitName}</span>
                    </div>
                  ) : (
                    <p
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPriceKey(item.lineKey);
                        setTempPrice(item.price.toString());
                      }}
                      className="text-xs text-muted-foreground/80 mt-0.5 font-medium hover:text-primary hover:underline cursor-pointer flex items-center gap-1 group/price"
                      title="Click to edit unit price"
                    >
                      {formatCurrency(item.price)} / {item.unitName}
                      <Pencil className="w-3 h-3 text-primary opacity-0 group-hover/price:opacity-100 transition-opacity" />
                      {item.unitFactor > 1 && <span className="ml-1 opacity-70">({item.unitFactor} base)</span>}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 bg-muted/40 p-0.5 rounded-lg border border-border/20">
                  <button onClick={() => updateQty(item.lineKey, -1)} className="w-6.5 h-6.5 rounded-md bg-muted/50 hover:bg-muted border border-transparent hover:border-border flex items-center justify-center transition-colors active:scale-95"><Minus className="w-3 h-3" /></button>
                  <span className="w-7 text-center text-sm font-bold text-foreground">{item.qty}</span>
                  <button onClick={() => updateQty(item.lineKey, 1)} className="w-6.5 h-6.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 border border-transparent hover:border-primary/30 flex items-center justify-center transition-colors active:scale-95"><Plus className="w-3.5 h-3.5" /></button>
                </div>
                <p className="text-sm font-bold text-foreground w-16 text-right">{formatCurrency(item.price * item.qty)}</p>
                <button onClick={() => removeFromCart(item.lineKey)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all duration-200"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
          {cart.length > 0 && (
            <div className="p-5 border-t border-border/50 space-y-4 bg-card/45 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-muted-foreground/60" />
                <input type="number" min={0} max={100} value={discountPercent || ""} onChange={(e) => setDiscountPercent(Number(e.target.value))} placeholder="Discount %" className="flex-1 h-9 rounded-lg border border-border/50 bg-background/50 px-3 text-xs text-foreground outline-none focus:border-primary/50 transition-colors" />
              </div>
              <div className="space-y-2 text-xs p-3.5 rounded-xl bg-muted/20 border border-border/20">
                <div className="flex justify-between text-muted-foreground font-medium"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                {discountPercent > 0 && <div className="flex justify-between text-success font-semibold"><span>Discount ({discountPercent}%)</span><span>-{formatCurrency(discountAmount)}</span></div>}
                <div className="flex justify-between text-muted-foreground font-medium"><span>Tax ({settings.taxRate}%)</span><span>{formatCurrency(tax)}</span></div>
                <div className="flex justify-between items-end pt-3 mt-1.5 border-t border-border/50">
                  <span className="text-xs font-semibold text-muted-foreground mb-1">Total Amount</span>
                  <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80 tracking-tight">{formatCurrency(total)}</span>
                </div>
              </div>
              <div className="flex gap-2.5">
                {paymentMethods.map((pm) => (
                  <button key={pm.id} onClick={() => setPaymentMethod(pm.id)} className={`flex-1 flex flex-col items-center gap-2 p-3.5 rounded-xl border-2 transition-all duration-300 active:scale-95 ${paymentMethod === pm.id ? "border-primary bg-primary/10 text-primary shadow-lg shadow-primary/5" : "border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}>
                    <pm.icon className={`w-5 h-5 transition-transform duration-300 ${paymentMethod === pm.id ? "scale-110 text-primary" : ""}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{pm.label}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowPayment(true)} className="w-full py-4 mt-1 rounded-xl bg-gradient-to-r from-primary to-primary/85 hover:from-primary/95 hover:to-primary/90 text-primary-foreground font-bold text-base transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]">
                <DollarSign className="w-4.5 h-4.5" />Charge {formatCurrency(total)}
              </button>
            </div>
          )}
        </div>
      </div>

      {completedSale && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { setCompletedSale(null); setTimeout(() => searchInputRef.current?.focus(), 100); }}>
          <div className="glass-card rounded-2xl max-w-sm w-full animate-fade-in max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4"><Check className="w-8 h-8 text-success" /></div>
              <h3 className="text-xl font-bold text-foreground text-center">Sale Complete!</h3>
              <p className="text-sm text-muted-foreground text-center mt-1">{completedSale.id}</p>
              <div className="mt-4">
                <ReceiptTemplate
                  ref={receiptRef}
                  sale={completedSale as ReceiptData}
                  company={companyProfile}
                  formatCurrency={formatCurrency}
                  settings={settings}
                />
              </div>
            </div>
            <div className="flex gap-2 p-4 border-t border-border bg-card/80 backdrop-blur-md shrink-0">
              <button onClick={() => { setCompletedSale(null); setTimeout(() => searchInputRef.current?.focus(), 100); }} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">New Sale</button>
              <button
                onClick={() => {
                  const text = generateReceiptText(
                    completedSale as ReceiptData,
                    companyProfile,
                    formatCurrency,
                    settings
                  );
                  printText(text, `Receipt ${completedSale.id}`);
                }}
                className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
            </div>
          </div>
        </div>
      )}

      <BarcodeScanner open={showScanner} onClose={() => setShowScanner(false)} onScan={handleBarcodeScan} />

      <PaymentDialog
        open={showPayment}
        total={total}
        customerName={customerName || "Walk-in"}
        customerSelected={!!customerId}
        formatCurrency={formatCurrency}
        currencySymbol={settings.currencySymbol}
        onCancel={() => setShowPayment(false)}
        onConfirm={(result) => completeSale(result)}
      />

      {showCustomerDetail && customerId && (
        <CustomerDetailDialog
          customerId={customerId}
          formatCurrency={formatCurrency}
          onClose={() => setShowCustomerDetail(false)}
        />
      )}
    </AppLayout>
  );
}



