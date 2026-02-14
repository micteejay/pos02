import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  GitBranch,
  Bell,
  Users,
  Shield,
  Settings,
  Building2,
  Package,
  BarChart3,
  ClipboardCheck,
} from "lucide-react";

const routes = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/", group: "Overview" },
  { label: "Notifications", icon: Bell, path: "/notifications", group: "Overview" },
  { label: "Inventory", icon: Package, path: "/inventory", group: "Operations" },
  { label: "Sales", icon: BarChart3, path: "/sales", group: "Operations" },
  { label: "Workflows", icon: GitBranch, path: "/workflows", group: "Operations" },
  { label: "Approvals", icon: ClipboardCheck, path: "/approvals", group: "Operations" },
  { label: "Chat", icon: MessageSquare, path: "/chat", group: "Communication" },
  { label: "Documents", icon: FileText, path: "/documents", group: "Communication" },
  { label: "Users & Roles", icon: Users, path: "/users", group: "Management" },
  { label: "Organization", icon: Building2, path: "/organization", group: "Management" },
  { label: "Audit Log", icon: Shield, path: "/audit", group: "Management" },
  { label: "Settings", icon: Settings, path: "/settings", group: "Management" },
];

const groups = ["Overview", "Operations", "Communication", "Management"];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search modules..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {groups.map((group, i) => (
          <div key={group}>
            {i > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {routes
                .filter((r) => r.group === group)
                .map((route) => (
                  <CommandItem
                    key={route.path}
                    onSelect={() => handleSelect(route.path)}
                    className="cursor-pointer"
                  >
                    <route.icon className="mr-2 h-4 w-4" />
                    <span>{route.label}</span>
                  </CommandItem>
                ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
