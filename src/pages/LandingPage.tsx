import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  DollarSign, ShoppingCart, TrendingUp, Users, Shield, Database,
  Cpu, Cloud, ArrowRight, CheckCircle2, ChevronRight, Menu, X, Play,
  Smartphone, Monitor, Sparkles, MessageSquare, RotateCcw, HelpCircle, Star
} from "lucide-react";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [checkoutTotal, setCheckoutTotal] = useState(0);
  const [checkoutItems, setCheckoutItems] = useState<{ id: string; name: string; price: number; qty: number }[]>([]);
  const [activeTab, setActiveTab] = useState<"pos" | "sync" | "backup">("pos");
  const [galleryTab, setGalleryTab] = useState<"pos" | "analytics">("pos");

  // Sample items for the interactive POS demo widget
  const posProducts = [
    { id: "1", name: "Premium Widget Alpha", price: 29.99, color: "from-blue-500 to-indigo-500" },
    { id: "2", name: "Wireless Smart Sensor", price: 89.99, color: "from-purple-500 to-pink-500" },
    { id: "3", name: "USB-C Multi-Hub", price: 19.99, color: "from-emerald-500 to-teal-500" },
  ];

  const addToPOSDemo = (p: typeof posProducts[0]) => {
    setCheckoutItems(prev => {
      const existing = prev.find(item => item.id === p.id);
      if (existing) {
        return prev.map(item => item.id === p.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { id: p.id, name: p.name, price: p.price, qty: 1 }];
    });
  };

  const removeFromPOSDemo = (id: string) => {
    setCheckoutItems(prev => prev.filter(item => item.id !== id));
  };

  useEffect(() => {
    const total = checkoutItems.reduce((acc, item) => acc + item.price * item.qty, 0);
    setCheckoutTotal(total);
  }, [checkoutItems]);

  const clearPOSDemo = () => {
    setCheckoutItems([]);
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden font-sans selection:bg-primary/30 antialiased">
      {/* Header / Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" className="w-8 h-8 object-contain rounded-lg shadow-sm" alt="VitePOS Logo" />
            <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">
              Vite<span className="text-primary">POS</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#demo" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">POS Terminal Demo</a>
            <a href="#architecture" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Architecture</a>
            <a href="#backups" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Backups</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" id="nav-btn-login" className="text-sm font-semibold hover:text-primary transition-colors px-4 py-2">
              Sign In
            </Link>
            <Link to="/signup" id="nav-btn-signup" className="text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all px-4 py-2 rounded-xl shadow-md shadow-primary/10">
              Try For Free
            </Link>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 md:hidden hover:bg-muted/50 rounded-lg">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-background py-4 px-4 flex flex-col gap-4 animate-slide-down">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-muted-foreground hover:text-foreground">Features</a>
            <a href="#demo" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-muted-foreground hover:text-foreground">POS Terminal Demo</a>
            <a href="#architecture" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-muted-foreground hover:text-foreground">Architecture</a>
            <a href="#backups" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-muted-foreground hover:text-foreground">Backups</a>
            <div className="h-px bg-border my-1" />
            <div className="flex flex-col gap-2">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="text-center text-sm font-semibold py-2.5 rounded-xl border border-border">
                Sign In
              </Link>
              <Link to="/signup" onClick={() => setMobileMenuOpen(false)} className="text-center text-sm font-semibold bg-primary text-primary-foreground py-2.5 rounded-xl">
                Try For Free
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:py-28 lg:py-36 overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-accent/15 blur-[100px] rounded-full pointer-events-none -z-10 animate-pulse" />

        <div className="container mx-auto px-4 max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold animate-pulse">
              <Sparkles className="w-3.5 h-3.5" /> Next-Gen Offline-First POS
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-foreground">
              Smart POS Platform for <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-accent">Modern Retail</span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0">
              Run checkout instantly. Sync automatically. Manage multiple warehouses, suppliers, purchase orders, approval pipelines, and get AI-driven sales insights — even completely offline.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link to="/signup" id="hero-btn-primary" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 hover:scale-[1.02] transition-all shadow-lg shadow-primary/25">
                Get Started for Free <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#demo" id="hero-btn-secondary" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-border bg-card/40 text-foreground font-semibold hover:bg-muted/50 transition-all">
                <Play className="w-4 h-4 fill-foreground/10 text-foreground" /> Interactive Demo
              </a>
            </div>

            <div className="pt-6 grid grid-cols-3 gap-6 max-w-md mx-auto lg:mx-0 border-t border-border/40">
              <div>
                <p className="text-2xl font-bold text-foreground">99.9%</p>
                <p className="text-xs text-muted-foreground">Local Uptime (Offline)</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">&lt; 10ms</p>
                <p className="text-xs text-muted-foreground">Checkout Latency</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">2-Way</p>
                <p className="text-xs text-muted-foreground">Sync Engine</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 flex justify-center">
            {/* Visual Glassmorphic App Window Mockup */}
            <div className="relative w-full max-w-[550px] aspect-[4/3] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden group hover:scale-[1.01] transition-transform duration-300">
              {/* Window Header */}
              <div className="h-10 border-b border-border/50 bg-muted/40 px-4 flex items-center gap-1.5 shrink-0 justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-warning/60" />
                  <div className="w-3 h-3 rounded-full bg-success/60" />
                </div>
                <div className="h-5 w-36 rounded bg-muted flex items-center justify-center text-[9px] text-muted-foreground font-mono">
                  app.vitepos.com/pos
                </div>
                <div className="w-8 h-3" />
              </div>

              {/* Real App Screenshot */}
              <img 
                src="/pos_checkout_screenshot.png" 
                className="w-full h-full object-cover object-top" 
                alt="VitePOS Checkout Screen Mockup" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Grid */}
      <section id="features" className="py-20 bg-muted/30 relative">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Powering All Business Operations
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              A comprehensive system built on modern architecture, designed to simplify sales, inventory, and governance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="glass-card rounded-2xl p-6 bg-card border hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Ultra-Fast POS Terminal</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Check out clients instantly. Generates clean transaction numbers, prints receipts (A4 & thermal styles), and manages barcode inputs.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card rounded-2xl p-6 bg-card border hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Cpu className="w-5 h-5 text-accent" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Offline Sync Engine</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tauri-backed local SQLite synchronization queue. Cache products and checkout transactions locally, auto-syncing when internet restores.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card rounded-2xl p-6 bg-card border hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Database className="w-5 h-5 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Multi-Tenant Backup / Restore</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Export full company logs to a `.vitepbak` file. Our import module handles global unique constraints safely, avoiding duplicate SKUs or conflicts.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="glass-card rounded-2xl p-6 bg-card border hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Shield className="w-5 h-5 text-purple-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Four-Eyes Approval Workflows</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Configure manager reviews and admin approvals for purchase orders above thresholds. Fully traceable histories with approval state flags.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="glass-card rounded-2xl p-6 bg-card border hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-5 h-5 text-pink-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">AI Copilot & Document Linker</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Generate automatic visual receipts or invoices in one click, chat directly about inventory shortages, and index documents via parent scoping.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="glass-card rounded-2xl p-6 bg-card border hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Analytics & Audits</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Track revenue, payment splits, and rep performance. Full system audit logging tracks every data modification for absolute security.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interface Gallery / Product Tour Section */}
      <section className="py-20 bg-background relative border-t border-b border-border/30">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-12">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Product Tour</span>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Intuitive Interface, Built for Efficiency
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Experience the actual high-fidelity screens designed to streamline workflows and provide instant insights.
            </p>
          </div>

          <div className="flex flex-col items-center gap-8">
            {/* Tabs for screenshots */}
            <div className="flex items-center gap-1 p-1 bg-muted/60 border rounded-xl w-fit">
              <button
                onClick={() => setGalleryTab("pos")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  galleryTab === "pos" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                POS Checkout Screen
              </button>
              <button
                onClick={() => setGalleryTab("analytics")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  galleryTab === "analytics" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Analytics Dashboard
              </button>
            </div>

            {/* Display selected screenshot */}
            <div className="w-full max-w-4xl rounded-2xl border border-border/80 bg-card shadow-2xl overflow-hidden relative group animate-fade-in">
              <div className="h-10 border-b border-border/50 bg-muted/40 px-4 flex items-center gap-1.5 justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-warning/60" />
                  <div className="w-3 h-3 rounded-full bg-success/60" />
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {galleryTab === "pos" ? "app.vitepos.com/pos" : "app.vitepos.com/sales"}
                </span>
                <div className="w-8 h-3" />
              </div>

              <div className="relative aspect-[16/10] overflow-hidden">
                <img
                  src={galleryTab === "pos" ? "/pos_checkout_screenshot.png" : "/sales_dashboard_screenshot.png"}
                  alt={galleryTab === "pos" ? "VitePOS Terminal Interface" : "Sales Analytics Dashboard"}
                  className="w-full h-full object-cover object-top hover:scale-[1.02] transition-transform duration-700"
                />

                {/* Overlaid Play Button to simulate walkthrough video */}
                <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                  <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 transform scale-90 group-hover:scale-100 transition-transform duration-300">
                    <Play className="w-6 h-6 fill-current ml-1" />
                  </div>
                  <span className="absolute bottom-6 bg-background/80 text-foreground text-xs font-semibold px-3 py-1.5 rounded-full border border-border shadow-md">
                    Click "Try the POS Interface Now" below to play with it live!
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive POS Checkout Demo */}
      <section id="demo" className="py-20 relative">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Try the POS Interface Now
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Add products, review the sales ledger, and simulate an instant checkout process.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Catalog Grid */}
            <div className="lg:col-span-7 space-y-6">
              <div className="glass-card rounded-2xl border p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-sm uppercase tracking-wider">Product Catalog</span>
                  <span className="text-xs text-muted-foreground">Click items to add to cart</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {posProducts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addToPOSDemo(p)}
                      className="p-4 rounded-xl border bg-card hover:border-primary/60 transition-all text-left flex flex-col justify-between h-36 group hover:scale-[1.02]"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {p.name.charAt(0)}
                      </div>
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">{p.name}</p>
                        <p className="text-xs font-bold text-muted-foreground mt-1">${p.price}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tech Spec Accordion */}
              <div className="glass-card rounded-2xl border p-5 flex flex-col gap-3">
                <span className="font-bold text-foreground text-sm uppercase tracking-wider mb-2">POS Engine Capabilities</span>
                <div className="flex gap-2 p-3 rounded-lg bg-muted/40 border border-border/30">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    **Dynamic SKU mappings**: Auto-generates random unique codes on custom supplier items.
                  </p>
                </div>
                <div className="flex gap-2 p-3 rounded-lg bg-muted/40 border border-border/30">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    **Cash/Card payment split**: Fully supports multiple references and keeps track of balance dues.
                  </p>
                </div>
              </div>
            </div>

            {/* Cart Widget */}
            <div className="lg:col-span-5">
              <div className="glass-card rounded-2xl border bg-card/60 p-5 flex flex-col justify-between h-full min-h-[400px] relative overflow-hidden">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <span className="font-bold text-foreground text-sm uppercase tracking-wider flex items-center gap-1.5">
                      <ShoppingCart className="w-4 h-4 text-primary" /> Checkout cart
                    </span>
                    {checkoutItems.length > 0 && (
                      <button onClick={clearPOSDemo} className="text-xs text-destructive hover:underline">Clear</button>
                    )}
                  </div>

                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {checkoutItems.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
                        <ShoppingCart className="w-8 h-8 text-muted-foreground/30" />
                        <p className="text-xs">Your cart is empty.</p>
                      </div>
                    ) : (
                      checkoutItems.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-xs p-2 rounded bg-muted/40 border border-border/30 animate-fade-in">
                          <div>
                            <p className="font-semibold text-foreground">{item.name}</p>
                            <p className="text-muted-foreground text-[10px] mt-0.5">${item.price} each · Qty: {item.qty}</p>
                          </div>
                          <button onClick={() => removeFromPOSDemo(item.id)} className="p-1 rounded text-destructive hover:bg-destructive/10">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="border-t pt-4 space-y-4 mt-6">
                  <div className="flex justify-between text-sm font-bold text-foreground">
                    <span>Ledger Total:</span>
                    <span>${checkoutTotal.toFixed(2)}</span>
                  </div>
                  <Link
                    to={checkoutItems.length > 0 ? "/signup" : "#"}
                    className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                      checkoutItems.length > 0
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/10"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    Simulate Live Checkout <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section id="architecture" className="py-20 bg-muted/30 relative">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Engineering Overview</span>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Offline-First Sync Topology
            </h2>
            <p className="text-sm text-muted-foreground">
              A hybrid local-cloud architecture designed to never let connectivity issues halt your store sales.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">1</div>
                <div>
                  <h4 className="text-base font-bold text-foreground mb-1">Local SQLite Database Cache</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Inside the Tauri desktop bundle, a local SQLite repository stores store logs, catalog inventory, and completed transactions.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">2</div>
                <div>
                  <h4 className="text-base font-bold text-foreground mb-1">Sync Outbox Queue</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Every create, update, or delete transaction performed offline is stacked in an internal sync outbox repository inside the Tauri instance.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">3</div>
                <div>
                  <h4 className="text-base font-bold text-foreground mb-1">Automatic Cloud Reconnection</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    When the network status flags connected, the sync engine fires an autocommit loop, uploading all queued outbox records to Supabase in correct table order.
                  </p>
                </div>
              </div>
            </div>

            {/* Visual Flow chart of Sync Engine */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full max-w-[480px] p-6 rounded-2xl border border-border bg-card shadow-lg flex flex-col gap-6 items-center relative overflow-hidden">
                {/* Flow lines */}
                <div className="absolute top-1/2 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-primary to-accent -translate-y-1/2 -z-10 hidden sm:block" />

                <div className="flex flex-col sm:flex-row items-center gap-6 justify-between w-full">
                  {/* Local App Node */}
                  <div className="flex flex-col items-center p-4 rounded-xl border bg-card shadow-sm w-36 text-center">
                    <Smartphone className="w-7 h-7 text-primary mb-2" />
                    <span className="text-xs font-bold text-foreground">Tauri/SQLite</span>
                    <span className="text-[9px] text-muted-foreground mt-1">Local App Store</span>
                  </div>

                  {/* Sync Queue Node */}
                  <div className="flex flex-col items-center p-4 rounded-xl border bg-card shadow-sm w-36 text-center border-accent bg-accent/5">
                    <RotateCcw className="w-7 h-7 text-accent mb-2 animate-spin-slow" />
                    <span className="text-xs font-bold text-foreground">Sync Queue</span>
                    <span className="text-[9px] text-muted-foreground mt-1">Outbox Commit</span>
                  </div>

                  {/* Supabase Node */}
                  <div className="flex flex-col items-center p-4 rounded-xl border bg-card shadow-sm w-36 text-center">
                    <Cloud className="w-7 h-7 text-primary mb-2" />
                    <span className="text-xs font-bold text-foreground">Supabase</span>
                    <span className="text-[9px] text-muted-foreground mt-1">Cloud Engine</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Backups & Company Import Feature */}
      <section id="backups" className="py-20 relative">
        <div className="container mx-auto px-4 max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 flex justify-center order-last lg:order-first">
            <div className="w-full max-w-[500px] rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b pb-3">
                <Database className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">Backup manifest preview</span>
              </div>
              <div className="font-mono text-[10px] text-muted-foreground bg-muted/50 p-4 rounded-lg border border-border/40 overflow-x-auto">
                <p className="text-foreground">{"{"}</p>
                <p className="pl-4">"company_name": "Metro Retail Group",</p>
                <p className="pl-4">"exported_at": "2026-06-27T05:00:00Z",</p>
                <p className="pl-4">"row_counts": {"{"}</p>
                <p className="pl-8">"inventory_items": 142,</p>
                <p className="pl-8">"purchase_orders": 34,</p>
                <p className="pl-8">"sales_transactions": 892</p>
                <p className="pl-4">{"}"},</p>
                <p className="pl-4">"backup_suffix": <span className="text-primary">"H7B2"</span> <span className="text-accent">// Prevent DB constraint errors!</span></p>
                <p className="text-foreground">{"}"}</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-500 text-xs font-semibold">
              <Database className="w-3.5 h-3.5" /> Conflict-Free Backups
            </div>
            <h3 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Move Tenant Data Smoothly Between Accounts
            </h3>
            <p className="text-base text-muted-foreground leading-relaxed">
              Export everything — inventory items, sales records, customer profiles, audit histories, and settings — in a single `.vitepbak` file.
            </p>
            <div className="space-y-3.5">
              <div className="flex items-start gap-3 justify-center lg:justify-start">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-1" />
                <p className="text-xs sm:text-sm text-muted-foreground">**Global roles re-use**: Avoids duplicate roles inserting and foreign key violations.</p>
              </div>
              <div className="flex items-start gap-3 justify-center lg:justify-start">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-1" />
                <p className="text-xs sm:text-sm text-muted-foreground">**Auto key suffixes**: Appends random strings to conflicting SKUs/transaction numbers.</p>
              </div>
              <div className="flex items-start gap-3 justify-center lg:justify-start">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-1" />
                <p className="text-xs sm:text-sm text-muted-foreground">**Linked reference cascades**: Automatically updates SKUs inside transactions on restore.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-muted/20 relative">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Trusted by Merchants Worldwide
            </h2>
            <p className="text-sm text-muted-foreground">
              Discover what business owners think about their checkout efficiency improvements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border bg-card shadow-sm flex flex-col justify-between">
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed italic">
                "Our store is located in a basement where internet drops frequently. With the offline SQLite sync, our cashier checks out customers without lag, and it commits changes when online."
              </p>
              <div className="flex items-center gap-3 mt-6">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">SC</div>
                <div>
                  <p className="text-xs font-bold text-foreground">Sarah Campbell</p>
                  <p className="text-[10px] text-muted-foreground">Store Manager, Metro Retail</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl border bg-card shadow-sm flex flex-col justify-between">
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed italic">
                "We migration test regularly. Being able to backup our company database to a file and import it cleanly without SKU conflicts or foreign key violations saves us hours of setup time."
              </p>
              <div className="flex items-center gap-3 mt-6">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">JD</div>
                <div>
                  <p className="text-xs font-bold text-foreground">Jonathan Doe</p>
                  <p className="text-[10px] text-muted-foreground">IT Administrator, Retail Corp</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl border bg-card shadow-sm flex flex-col justify-between">
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed italic">
                "The approval pipelines are very well designed. Transactions above $5,000 automatically lock for Manager Review. Our internal governance audits have never been this clean."
              </p>
              <div className="flex items-center gap-3 mt-6">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">OA</div>
                <div>
                  <p className="text-xs font-bold text-foreground">Obinna Anya</p>
                  <p className="text-[10px] text-muted-foreground">Operations Director, Apex Mart</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative bg-primary/5 border-t border-b border-primary/10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-primary/10 blur-[90px] rounded-full pointer-events-none -z-10" />
        <div className="container mx-auto px-4 max-w-5xl text-center space-y-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Ready to Accelerate Your Checkout Operations?
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            Get started today. Sign up for a free company profile account. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <Link to="/signup" id="cta-btn-primary" className="w-full sm:flex-1 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/10">
              Sign Up Now
            </Link>
            <Link to="/login" id="cta-btn-secondary" className="w-full sm:flex-1 py-3.5 rounded-xl border border-border bg-card/85 text-foreground font-semibold hover:bg-muted/40 transition-all">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/40 bg-card">
        <div className="container mx-auto px-4 max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src="/logo.png" className="w-8 h-8 object-contain rounded-lg" alt="VitePOS Logo" />
            <span className="font-extrabold text-sm tracking-tight text-foreground">
              VitePOS
            </span>
          </div>

          <p className="text-xs text-muted-foreground order-last md:order-none">
            &copy; 2026 VitePOS Retail Systems. All rights reserved.
          </p>

          <div className="flex gap-4">
            <a href="#features" className="text-xs text-muted-foreground hover:text-foreground">Features</a>
            <a href="#demo" className="text-xs text-muted-foreground hover:text-foreground">Demo</a>
            <a href="#architecture" className="text-xs text-muted-foreground hover:text-foreground">Architecture</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
