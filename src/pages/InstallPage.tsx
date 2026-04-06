import { useState, useEffect } from "react";
import { Download, Smartphone, Monitor, CheckCircle } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-8 text-center">
        <div className="space-y-4">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-2xl">P</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Install POS App</h1>
          <p className="text-muted-foreground">
            Install this app on your device for the best experience — works offline and launches instantly.
          </p>
        </div>

        {isInstalled ? (
          <div className="flex items-center justify-center gap-3 p-4 bg-green-500/10 rounded-xl">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <span className="text-green-500 font-medium">App is already installed!</span>
          </div>
        ) : deferredPrompt ? (
          <button
            onClick={handleInstall}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-semibold text-lg"
          >
            <Download className="w-5 h-5" />
            Install Now
          </button>
        ) : (
          <div className="space-y-4">
            {isIOS ? (
              <div className="p-6 bg-muted rounded-xl text-left space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Smartphone className="w-5 h-5" /> Install on iOS
                </h3>
                <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                  <li>Tap the <strong>Share</strong> button in Safari</li>
                  <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
                  <li>Tap <strong>Add</strong> to confirm</li>
                </ol>
              </div>
            ) : (
              <div className="p-6 bg-muted rounded-xl text-left space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Monitor className="w-5 h-5" /> How to install
                </h3>
                <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                  <li>Open this page in <strong>Chrome</strong> or <strong>Edge</strong></li>
                  <li>Click the install icon in the address bar</li>
                  <li>Or use the browser menu → <strong>Install app</strong></li>
                </ol>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 pt-4">
          {[
            { icon: "⚡", label: "Fast" },
            { icon: "📱", label: "Native feel" },
            { icon: "🔒", label: "Secure" },
          ].map((item) => (
            <div key={item.label} className="p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl mb-1">{item.icon}</div>
              <div className="text-xs text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
