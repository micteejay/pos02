import AppLayout from "@/components/AppLayout";
import { MessageSquare, Hash, Users, Search, Send, Smile, Paperclip, MoreVertical } from "lucide-react";

const channels = [
  { name: "general", type: "channel", unread: 2 },
  { name: "sales-team", type: "channel", unread: 0 },
  { name: "inventory-alerts", type: "channel", unread: 5 },
  { name: "management", type: "channel", unread: 0 },
];

const directMessages = [
  { name: "Sarah Chen", status: "online", unread: 1 },
  { name: "Mike Ross", status: "online", unread: 0 },
  { name: "Lisa Park", status: "away", unread: 0 },
  { name: "James Wilson", status: "offline", unread: 2 },
];

const messages = [
  { sender: "Sarah Chen", time: "10:24 AM", text: "The Q4 inventory report is ready for review. I've shared it in the documents section.", avatar: "SC" },
  { sender: "Mike Ross", time: "10:28 AM", text: "Thanks Sarah! I'll take a look. @Lisa can you cross-reference with the sales numbers?", avatar: "MR" },
  { sender: "Lisa Park", time: "10:32 AM", text: "Sure, give me 30 minutes. Also, we need to discuss the new warehouse stock transfer workflow.", avatar: "LP" },
  { sender: "You", time: "10:35 AM", text: "Great teamwork everyone. Let's sync up after lunch to finalize the approvals.", avatar: "YO" },
];

export default function ChatPage() {
  return (
    <AppLayout>
      <div className="flex h-screen">
        {/* Channel List */}
        <div className="w-64 border-r border-border bg-muted/30 flex flex-col shrink-0">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border text-xs text-muted-foreground">
              <Search className="w-3.5 h-3.5" />
              <span>Search messages...</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 mb-2">Channels</p>
              {channels.map((ch) => (
                <button key={ch.name} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors ${ch.name === "general" ? "bg-muted text-foreground font-medium" : "text-muted-foreground"}`}>
                  <Hash className="w-3.5 h-3.5" />
                  <span className="truncate">{ch.name}</span>
                  {ch.unread > 0 && <span className="ml-auto bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">{ch.unread}</span>}
                </button>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 mb-2">Direct Messages</p>
              {directMessages.map((dm) => (
                <button key={dm.name} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted transition-colors">
                  <div className="relative">
                    <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-medium text-secondary-foreground">
                      {dm.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${dm.status === "online" ? "bg-success" : dm.status === "away" ? "bg-warning" : "bg-muted-foreground/30"}`} />
                  </div>
                  <span className="truncate">{dm.name}</span>
                  {dm.unread > 0 && <span className="ml-auto bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">{dm.unread}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="h-14 border-b border-border px-5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">general</h2>
              <span className="text-xs text-muted-foreground">· 24 members</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Users className="w-4 h-4 cursor-pointer hover:text-foreground transition-colors" />
              <Search className="w-4 h-4 cursor-pointer hover:text-foreground transition-colors" />
              <MoreVertical className="w-4 h-4 cursor-pointer hover:text-foreground transition-colors" />
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 animate-fade-in ${msg.sender === "You" ? "flex-row-reverse" : ""}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${msg.sender === "You" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                  {msg.avatar}
                </div>
                <div className={`max-w-lg ${msg.sender === "You" ? "text-right" : ""}`}>
                  <div className={`flex items-baseline gap-2 ${msg.sender === "You" ? "justify-end" : ""}`}>
                    <span className="text-sm font-medium text-foreground">{msg.sender}</span>
                    <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                  </div>
                  <p className={`text-sm mt-1 p-3 rounded-xl ${msg.sender === "You" ? "bg-primary/10 text-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"}`}>
                    {msg.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-2 bg-muted rounded-xl px-4 py-3">
              <Paperclip className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <Smile className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
              <button className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center hover:opacity-90 transition-opacity">
                <Send className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
