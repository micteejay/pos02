import { useState, useMemo, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import {
  Search, Plus, Minus, X, ShoppingCart, CreditCard, Banknote, Smartphone,
  Trash2, Receipt, User, Barcode, Tag, Check, Package, Percent, DollarSign,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  category: string;
  stock: number;
  image?: string;
}

interface CartItem {
  product: Product;
  qty: number;
  discount: number;
}

const products: Product[] = [
  { id: "p1", name: "Widget Alpha", sku: "WDG-A100", price: 24.99, category: "Components", stock: 12 },
  { id: "p2", name: "Widget Beta", sku: "WDG-B200", price: 18.50, category: "Components", stock: 340 },
  { id: "p3", name: "Sensor X10", sku: "SEN-X10", price: 89.00, category: "Electronics", stock: 45 },
  { id: "p4", name: "Motor 500W", sku: "MTR-500", price: 145.00, category: "Machinery", stock: 78 },
  { id: "p5", name: "Cat6 Cable (100ft)", sku: "CBL-CAT6", price: 34.99, category: "Networking", stock: 520 },
  { id: "p6", name: "PCB Board Rev3", sku: "PCB-R3", price: 12.75, category: "Electronics", stock: 8 },
  { id: "p7", name: "Cooling Fan 120mm", sku: "FAN-120", price: 9.99, category: "Components", stock: 190 },
  { id: "p8", name: "PSU 750W Gold", sku: "PSU-750", price: 119.00, category: "Electronics", stock: 62 },
  { id: "p9", name: "USB Hub 7-Port", sku: "USB-H7", price: 29.99, category: "Accessories", stock: 200 },
  { id: "p10", name: "LED Strip 5m", sku: "LED-5M", price: 15.99, category: "Accessories", stock: 310 },
  { id: "p11", name: "Thermal Paste 10g", sku: "THP-10", price: 8.49, category: "Components", stock: 450 },
  { id: "p12", name: "Network Switch 8P", sku: "NSW-8P", price: 64.99, category: "Networking", stock: 85 },
];

const categories = ["All", ...new Set(products.map((p) => p.category))];

const paymentMethods = [
  { id: "card", label: "Credit Card", icon: CreditCard },
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "mobile", label: "Mobile Pay", icon: Smartphone },
];

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [showCheckout, setShowCheckout] = useState(false);
  const [completedSale, setCompletedSale] = useState<{ id: string; total: number } | null>(null);
  const [discountPercent, setDiscountPercent] = useState(0);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
      const matchCategory = category === "All" || p.category === category;
      return matchSearch && matchCategory;
    });
  }, [search, category]);

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map((i) => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { product, qty: 1, discount: 0 }];
    });
  }, []);

  const updateQty = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.product.id !== productId) return i;
        const newQty = i.qty + delta;
        if (newQty <= 0) return i;
        if (newQty > i.product.stock) return i;
        return { ...i, qty: newQty };
      })
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.product.price * i.qty * (1 - i.discount / 100), 0), [cart]);
  const discountAmount = subtotal * (discountPercent / 100);
  const tax = (subtotal - discountAmount) * 0.08;
  const total = subtotal - discountAmount + tax;
  const itemCount = cart.reduce((s, i) => s + i.qty, 0);

  const completeSale = () => {
    const saleId = `TXN-${9300 + Math.floor(Math.random() * 100)}`;
    setCompletedSale({ id: saleId, total });
    setCart([]);
    setCustomerName("");
    setDiscountPercent(0);
    setShowCheckout(false);
  };

  return (
    <AppLayout>
      <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-2rem)] -m-4 sm:-m-6 lg:-m-8 gap-0">
        {/* Product Grid */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border">
          {/* Header */}
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-foreground">Point of Sale</h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                Store: Main HQ
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products or scan barcode..." className="pl-9" />
              </div>
              <button className="p-2.5 rounded-lg border border-border hover:bg-muted transition-colors">
                <Barcode className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${category === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Products */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((p) => {
                const inCart = cart.find((i) => i.product.id === p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={p.stock === 0}
                    className={`glass-card rounded-xl p-4 text-left transition-all hover:border-primary/30 hover:shadow-md disabled:opacity-40 relative group ${inCart ? "border-primary/40 bg-primary/5" : ""}`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3">
                      <Package className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{p.sku}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-base font-bold text-primary">${p.price.toFixed(2)}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${p.stock < 15 ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
                        {p.stock} left
                      </span>
                    </div>
                    {inCart && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                        {inCart.qty}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Cart */}
        <div className="w-full lg:w-[380px] flex flex-col shrink-0 bg-card/50">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground">Cart</h2>
                {itemCount > 0 && <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">{itemCount}</span>}
              </div>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs text-destructive hover:underline">Clear</button>
              )}
            </div>
            {/* Customer */}
            <div className="flex items-center gap-2 mt-3">
              <User className="w-4 h-4 text-muted-foreground" />
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in Customer"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none border-b border-border/50 pb-1"
              />
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">Cart is empty</p>
                <p className="text-xs mt-1">Click products to add them</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">${item.product.price.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQty(item.product.id, -1)} className="w-6 h-6 rounded bg-background border border-border flex items-center justify-center hover:bg-muted">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-foreground">{item.qty}</span>
                    <button onClick={() => updateQty(item.product.id, 1)} className="w-6 h-6 rounded bg-background border border-border flex items-center justify-center hover:bg-muted">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-foreground w-16 text-right">
                    ${(item.product.price * item.qty).toFixed(2)}
                  </p>
                  <button onClick={() => removeFromCart(item.product.id)} className="p-1 rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Totals & Checkout */}
          {cart.length > 0 && (
            <div className="p-4 border-t border-border space-y-3">
              {/* Discount */}
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-muted-foreground" />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={discountPercent || ""}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  placeholder="Discount %"
                  className="flex-1 h-8 rounded-md border border-input bg-background px-3 text-xs text-foreground outline-none"
                />
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {discountPercent > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Discount ({discountPercent}%)</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax (8%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-foreground pt-2 border-t border-border">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="flex gap-2">
                {paymentMethods.map((pm) => (
                  <button
                    key={pm.id}
                    onClick={() => setPaymentMethod(pm.id)}
                    className={`flex-1 flex flex-col items-center gap-1.5 p-2.5 rounded-lg border text-xs font-medium transition-colors ${paymentMethod === pm.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                  >
                    <pm.icon className="w-4 h-4" />
                    {pm.label}
                  </button>
                ))}
              </div>

              <button
                onClick={completeSale}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                Charge ${total.toFixed(2)}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sale Complete Modal */}
      {completedSale && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setCompletedSale(null)}>
          <div className="glass-card rounded-2xl p-8 max-w-sm w-full text-center animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-success" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Sale Complete!</h3>
            <p className="text-sm text-muted-foreground mt-2">Transaction {completedSale.id}</p>
            <p className="text-3xl font-bold text-primary mt-3">${completedSale.total.toFixed(2)}</p>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setCompletedSale(null)} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
                New Sale
              </button>
              <button className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-1">
                <Receipt className="w-4 h-4" /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
