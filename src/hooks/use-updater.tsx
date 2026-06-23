import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { toast } from "sonner";

interface UpdateContextType {
  update: Update | null;
  isChecking: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  installUpdate: () => Promise<void>;
}

const UpdateContext = createContext<UpdateContextType | null>(null);

export function UpdateProvider({ children }: { children: ReactNode }) {
  const [update, setUpdate] = useState<Update | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    const checkForUpdates = async () => {
      if (!isTauri()) return;
      try {
        setIsChecking(true);
        const u = await check();
        if (u) {
          setUpdate(u);
          // Optional: We still show a quick non-intrusive toast but no action button in it
          toast(`New update available: ${u.version}`, { duration: 5000 });
        }
      } catch (error) {
        console.error("Failed to check for updates:", error);
      } finally {
        setIsChecking(false);
      }
    };
    checkForUpdates();
  }, []);

  const installUpdate = async () => {
    if (!update || isDownloading) return;
    setIsDownloading(true);
    let downloaded = 0;
    let contentLength = 0;
    toast.loading("Downloading update...", { id: "downloading-toast" });
    
    try {
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0;
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              setDownloadProgress(Math.round((downloaded / contentLength) * 100));
            }
            break;
          case 'Finished':
            toast.dismiss("downloading-toast");
            toast.success("Update installed, restarting...");
            break;
        }
      });
      await relaunch();
    } catch (e) {
      console.error(e);
      toast.dismiss("downloading-toast");
      toast.error("Failed to install update");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <UpdateContext.Provider value={{ update, isChecking, isDownloading, downloadProgress, installUpdate }}>
      {children}
    </UpdateContext.Provider>
  );
}

export const useUpdater = () => {
  const ctx = useContext(UpdateContext);
  if (!ctx) throw new Error("useUpdater must be used within UpdateProvider");
  return ctx;
};
