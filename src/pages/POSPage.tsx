import { useState, useMemo, useCallback } from "react";
import { useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useSharedData, type ItemUnit, type InventoryItem } from "@/hooks/use-shared-data";
import { useAuth } from "@/hooks/use-auth";
import { useCustomers } from "@/hooks/use-customers";
import CustomerPicker from "@/components/CustomerPicker";
import { printNode, printText } from "@/lib/print";
import { generateReceiptText } from "@/lib/receipt-text";
import ReceiptTemplate from "@/components/ReceiptTemplate";
import BarcodeScanner from "@/components/BarcodeScanner";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { toast } from "sonner";
import {
  Search, Plus, Minus, X, ShoppingCart, CreditCard, Banknote, Smartphone,
  Trash2, Receipt, Barcode, Tag, Check, Package, Percent, DollarSign, Printer,
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
  const { formatCurrency, settings } = useAppSettings();
  const { inventory, adjustInventoryQty, addSale, storeNames } = useSharedData();
  const { customers, findOrCreate } = useCustomers();
  const { companyProfile } = useAuth();
  const { user } = useAuth();
  const receiptRef = useRef<HTMLDivElement>(null);
  const activeStore = storeNames[0] || "Default Store";
  const categories = useMemo(() => {
    const cats = [...new Set(inventory.map(i => i.category))];
    return ["All", ...cats];
  }, [inventory]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [completedSale, setCompletedSale] = useState<{ id: string; total: number; subtotal: number; tax: number; discount: number; items: CartItem[]; customer: string; method: string; date?: string } | null>(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [heldOrders, setHeldOrders] = useState<{ id: string; cart: CartItem[]; customer: string }[]>([]);
  const [showHeld, setShowHeld] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

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
      if (baseInCart + unitFactor > item.qty) {
        toast.error(`Not enough stock (${item.qty} ${item.baseUnit || "pcs"} available)`);
        return prev;
      }
      if (existing) {
        return prev.map((i) => i.lineKey === lineKey ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { lineKey, sku: item.sku, name: item.name, price, qty: 1, discount: 0, stock: item.qty, unitName, unitFactor }];
    });
  }, []);

  const handleBarcodeScan = useCallback((barcode: string) => {
    const item = inventory.find(p => p.barcode === barcode || p.sku === barcode);
    if (item) {
      addToCart(item);
      toast.success(`Added ${item.name} to cart`);
    } else {
      toast.error("Product not found for barcode: " + barcode);
    }
  }, [inventory, addToCart]);

  // Auto-detect USB/Bluetooth barcode scanners
  useBarcodeScanner(handleBarcodeScan, !showScanner);

  const filteredProducts = useMemo(() => {
    return inventory.filter((p) => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()) || (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()));
      const matchCategory = category === "All" || p.category === category;
      return matchSearch && matchCategory;
    });
  }, [search, category, inventory]);




  const updateQty = useCallback((lineKey: string, delta: number) => {
    setCart((prev) => {
      const line = prev.find(i => i.lineKey === lineKey);
      if (!line) return prev;
      const newQty = line.qty + delta;
      if (newQty <= 0) return prev.filter(i => i.lineKey !== lineKey);
      const baseInCart = prev.filter(i => i.sku === line.sku && i.lineKey !== lineKey)
        .reduce((s, i) => s + i.qty * i.unitFactor, 0);
      if (baseInCart + newQty * line.unitFactor > line.stock) {
        toast.error(`Not enough stock`);
        return prev;
      }
      return prev.map(i => i.lineKey === lineKey ? { ...i, qty: newQty } : i);
    });
  }, []);

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

  const completeSale = async () => {
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
    addSale({
      items: cart.map(i => ({ name: `${i.name} (${i.unitName})`, sku: i.sku, qty: i.qty, price: i.price })),
      total, customer: resolvedName, method: paymentMethod, store: activeStore,
      createdBy: user?.name || "System", createdByRole: user?.role || "",
      customerId: resolvedId,
      customerEmail: resolvedEmail || null,
      customerPhone: resolvedPhone || null,
    });

    const saleId = `TXN-${9300 + Math.floor(Math.random() * 100)}`;
    const dateStr = new Date().toLocaleString();
    setCompletedSale({ id: saleId, total, subtotal, tax, discount: discountAmount, items: [...cart], customer: resolvedName, method: paymentMethod, date: dateStr });
    setCart([]); setCustomerName(""); setCustomerId(null); setCustomerEmail(""); setCustomerPhone(""); setDiscountPercent(0);
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
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products or scan barcode..." className="pl-11 h-12 text-base rounded-xl border-border/80 bg-background/50 backdrop-blur-sm shadow-sm hover:border-primary/40 focus-visible:ring-primary/20 transition-all" />
              </div>
              <button onClick={() => setShowScanner(true)} className="p-3 rounded-xl border border-border/80 bg-background/50 shadow-sm hover:bg-muted hover:border-primary/40 transition-all group">
                <Barcode className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide pt-1">
              {categories.map((c) => (
                <button key={c} onClick={() => setCategory(c)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${category === c ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105" : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground hover:scale-105"}`}>{c}</button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((p) => {
                const inCartLines = cart.filter((i) => i.sku === p.sku);
                const totalInCartBase = inCartLines.reduce((s, i) => s + i.qty * i.unitFactor, 0);
                const sellableUnits: ItemUnit[] = [
                  { name: p.baseUnit || "pcs", factor: 1, price: p.price },
                  ...((p.units || []).filter(u => (u.sellable ?? true) && u.name.trim())),
                ];
                return (
                  <div key={p.sku} className={`glass-card rounded-2xl p-4 text-left transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:-translate-y-1 relative group overflow-hidden ${totalInCartBase > 0 ? "border-primary/60 bg-primary/5 ring-1 ring-primary/20" : ""} ${p.qty === 0 ? "opacity-40 grayscale" : ""}`}>
                    {totalInCartBase > 0 && <div className="absolute inset-0 bg-primary/5 pointer-events-none animate-pulse-slow" />}
                    <button onClick={() => addToCart(p)} disabled={p.qty === 0} className="w-full text-left relative z-10 outline-none">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors ${totalInCartBase > 0 ? "bg-primary/20" : "bg-muted group-hover:bg-primary/10"}`}>
                        <Package className={`w-6 h-6 transition-colors ${totalInCartBase > 0 ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} />
                      </div>
                      <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{p.sku}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-base font-bold text-primary">{formatCurrency(p.price)}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${p.qty < 15 ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>{p.qty} {p.baseUnit || "pcs"}</span>
                      </div>
                    </button>
                    {sellableUnits.length > 1 && (
                      <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border/50">
                        {sellableUnits.map((u) => (
                          <button
                            key={u.name}
                            disabled={p.qty < u.factor}
                            onClick={(e) => { e.stopPropagation(); addToCart(p, u); }}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-muted hover:bg-primary/15 hover:text-primary text-muted-foreground font-medium disabled:opacity-40"
                            title={`Sell as ${u.name} (${u.factor} ${p.baseUnit || "pcs"} = ${formatCurrency(u.price)})`}
                          >
                            {u.name} · {formatCurrency(u.price)}
                          </button>
                        ))}
                      </div>
                    )}
                    {totalInCartBase > 0 && <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-lg shadow-primary/40 animate-in zoom-in">{totalInCartBase}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[400px] flex flex-col shrink-0 bg-background/80 backdrop-blur-md border-l border-border/50 shadow-2xl z-10">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground">Cart</h2>
                {itemCount > 0 && <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">{itemCount}</span>}
              </div>
              <div className="flex items-center gap-2">
                {cart.length > 0 && <button onClick={holdOrder} className="text-xs text-warning hover:underline">Hold</button>}
                {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs text-destructive hover:underline">Clear</button>}
              </div>
            </div>
            <div className="mt-3">
              <CustomerPicker
                compact
                value={{ id: customerId, name: customerName, email: customerEmail, phone: customerPhone }}
                onChange={(v) => { setCustomerId(v.id); setCustomerName(v.name); setCustomerEmail(v.email); setCustomerPhone(v.phone); }}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mb-3 opacity-20" /><p className="text-sm">Cart is empty</p><p className="text-xs mt-1">Click products to add them</p>
              </div>
            ) : cart.map((item) => (
              <div key={item.lineKey} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40 shadow-sm group hover:border-primary/30 transition-all animate-in slide-in-from-right-2 fade-in">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(item.price)} / {item.unitName}
                    {item.unitFactor > 1 && <span className="ml-1 opacity-70">({item.unitFactor} base)</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => updateQty(item.lineKey, -1)} className="w-7 h-7 rounded-md bg-muted/50 hover:bg-muted border border-transparent hover:border-border flex items-center justify-center transition-colors active:scale-95"><Minus className="w-3.5 h-3.5" /></button>
                  <span className="w-7 text-center text-sm font-bold text-foreground">{item.qty}</span>
                  <button onClick={() => updateQty(item.lineKey, 1)} className="w-7 h-7 rounded-md bg-primary/10 text-primary hover:bg-primary/20 border border-transparent hover:border-primary/30 flex items-center justify-center transition-colors active:scale-95"><Plus className="w-3.5 h-3.5" /></button>
                </div>
                <p className="text-sm font-semibold text-foreground w-16 text-right">{formatCurrency(item.price * item.qty)}</p>
                <button onClick={() => removeFromCart(item.lineKey)} className="p-1 rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3.5 h-3.5 text-destructive" /></button>
              </div>
            ))}
          </div>
          {cart.length > 0 && (
            <div className="p-4 border-t border-border space-y-3">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-muted-foreground" />
                <input type="number" min={0} max={100} value={discountPercent || ""} onChange={(e) => setDiscountPercent(Number(e.target.value))} placeholder="Discount %" className="flex-1 h-8 rounded-md border border-input bg-background px-3 text-xs text-foreground outline-none" />
              </div>
              <div className="space-y-2 text-sm p-3 rounded-xl bg-muted/30">
                <div className="flex justify-between text-muted-foreground font-medium"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                {discountPercent > 0 && <div className="flex justify-between text-success font-medium"><span>Discount ({discountPercent}%)</span><span>-{formatCurrency(discountAmount)}</span></div>}
                <div className="flex justify-between text-muted-foreground font-medium"><span>Tax ({settings.taxRate}%)</span><span>{formatCurrency(tax)}</span></div>
                <div className="flex justify-between items-end pt-3 mt-1 border-t border-border/60">
                  <span className="text-sm font-semibold text-muted-foreground mb-1">Total</span>
                  <span className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80 tracking-tight">{formatCurrency(total)}</span>
                </div>
              </div>
              <div className="flex gap-2.5">
                {paymentMethods.map((pm) => (
                  <button key={pm.id} onClick={() => setPaymentMethod(pm.id)} className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-300 active:scale-95 ${paymentMethod === pm.id ? "border-primary bg-primary/5 text-primary shadow-sm" : "border-transparent bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border/50"}`}>
                    <pm.icon className={`w-5 h-5 ${paymentMethod === pm.id ? "animate-bounce" : ""}`} />
                    <span className="text-[11px] font-bold uppercase tracking-wider">{pm.label}</span>
                  </button>
                ))}
              </div>
              <button onClick={completeSale} className="w-full py-4 mt-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 active:scale-[0.98]">
                <DollarSign className="w-5 h-5" />Charge {formatCurrency(total)}
              </button>
            </div>
          )}
        </div>
      </div>

      {completedSale && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setCompletedSale(null)}>
          <div className="glass-card rounded-2xl max-w-sm w-full animate-fade-in max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4"><Check className="w-8 h-8 text-success" /></div>
              <h3 className="text-xl font-bold text-foreground text-center">Sale Complete!</h3>
              <p className="text-sm text-muted-foreground text-center mt-1">{completedSale.id}</p>
              <div className="mt-4">
                <ReceiptTemplate
                  ref={receiptRef}
                  sale={completedSale as any}
                  company={companyProfile}
                  formatCurrency={formatCurrency}
                  settings={settings}
                />
              </div>
            </div>
            <div className="flex gap-2 p-4 border-t border-border bg-card/80 backdrop-blur-md shrink-0">
              <button onClick={() => setCompletedSale(null)} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">New Sale</button>
              <button
                onClick={() => {
                  const text = generateReceiptText(
                    completedSale as any,
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
    </AppLayout>
  );
}
