import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { useAppEvents } from "@/hooks/use-app-events";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useSharedData } from "@/hooks/use-shared-data";
import { MessageSquare, Hash, Users, Search, Send, Smile, Paperclip, Plus, Phone, Video, Pin, X, Trash2, Edit2, Bell, BellOff, FileText } from "lucide-react";

interface Message {
  id: string; sender: string; avatar: string; time: string; text: string; channel: string;
  reactions?: { emoji: string; count: number; reacted: boolean }[];
  pinned?: boolean; edited?: boolean; replyTo?: string;
  attachment?: { name: string; size: string; type: string };
}

interface Channel {
  id: string; name: string; type: "channel" | "dm"; unread: number; members?: number;
  status?: "online" | "away" | "offline"; description?: string; lastMessage?: string; muted?: boolean;
}

const initialChannels: Channel[] = [
  { id: "general", name: "general", type: "channel", unread: 2, members: 24, description: "Company-wide announcements and discussions" },
  { id: "sales-team", name: "sales-team", type: "channel", unread: 0, members: 12, description: "Sales team coordination" },
  { id: "inventory-alerts", name: "inventory-alerts", type: "channel", unread: 5, members: 8, description: "Automated inventory notifications" },
  { id: "management", name: "management", type: "channel", unread: 0, members: 6, description: "Management discussions" },
  { id: "dev-ops", name: "dev-ops", type: "channel", unread: 1, members: 10, description: "DevOps and infrastructure" },
];

const initialDMs: Channel[] = [
  { id: "dm-sarah", name: "Sarah Chen", type: "dm", unread: 1, status: "online", lastMessage: "The Q4 report is ready" },
  { id: "dm-mike", name: "Mike Ross", type: "dm", unread: 0, status: "online", lastMessage: "Thanks for the update" },
  { id: "dm-lisa", name: "Lisa Park", type: "dm", unread: 0, status: "away", lastMessage: "Let me check on that" },
  { id: "dm-james", name: "James Wilson", type: "dm", unread: 2, status: "offline", lastMessage: "Meeting moved to 3pm" },
  { id: "dm-maria", name: "Maria Garcia", type: "dm", unread: 0, status: "online", lastMessage: "Approved!" },
];

const initialMessages: Message[] = [
  { id: "m1", sender: "Sarah Chen", avatar: "SC", time: "10:24 AM", text: "The Q4 inventory report is ready for review. I've shared it in the documents section.", channel: "general", reactions: [{ emoji: "👍", count: 3, reacted: false }] },
  { id: "m2", sender: "Mike Ross", avatar: "MR", time: "10:28 AM", text: "Thanks Sarah! I'll take a look. @Lisa can you cross-reference with the sales numbers?", channel: "general" },
  { id: "m3", sender: "Lisa Park", avatar: "LP", time: "10:32 AM", text: "Sure, give me 30 minutes. Also, we need to discuss the new warehouse stock transfer workflow.", channel: "general", pinned: true },
  { id: "m4", sender: "You", avatar: "YO", time: "10:35 AM", text: "Great teamwork everyone. Let's sync up after lunch to finalize the approvals.", channel: "general", reactions: [{ emoji: "🎉", count: 2, reacted: false }, { emoji: "✅", count: 1, reacted: true }] },
  { id: "m5", sender: "David Kim", avatar: "DK", time: "10:40 AM", text: "Heads up — we have 3 low stock alerts on the West DC warehouse. Transfer request submitted.", channel: "inventory-alerts" },
  { id: "m6", sender: "System", avatar: "SY", time: "10:42 AM", text: "⚠️ Stock Alert: PCB Board Rev3 is critically low (8 units). Reorder point: 25.", channel: "inventory-alerts" },
  { id: "m7", sender: "Alice Chen", avatar: "AC", time: "9:15 AM", text: "Q1 targets have been distributed. Check the sales dashboard for your individual goals.", channel: "sales-team" },
  { id: "m8", sender: "Bob Tran", avatar: "BT", time: "9:30 AM", text: "Just closed a $12k deal with Metro Corp! 🎉", channel: "sales-team", reactions: [{ emoji: "🎉", count: 5, reacted: false }, { emoji: "💰", count: 3, reacted: false }] },
  { id: "m9", sender: "Sarah Chen", avatar: "SC", time: "11:00 AM", text: "Can you review the budget proposal I sent?", channel: "dm-sarah" },
  { id: "m10", sender: "James Wilson", avatar: "JW", time: "2:15 PM", text: "Meeting has been moved to 3pm tomorrow. Please update your calendars.", channel: "dm-james" },
  { id: "m11", sender: "James Wilson", avatar: "JW", time: "2:18 PM", text: "Also, we need to discuss the org restructuring plan.", channel: "dm-james" },
];

const emojiList = ["👍", "❤️", "😂", "🎉", "🔥", "✅", "👀", "💯"];

export default function ChatPage() {
  const { addNotification } = useAppEvents();
  const { currentUser } = useAppSettings();
  const { addDocument } = useSharedData();
  const [channels, setChannels] = useState(initialChannels);
  const [dms, setDms] = useState(initialDMs);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [activeChannel, setActiveChannel] = useState("general");
  const [inputText, setInputText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [editingMsg, setEditingMsg] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeChannelData = [...channels, ...dms].find((c) => c.id === activeChannel);
  const channelMessages = useMemo(() => {
    let msgs = messages.filter((m) => m.channel === activeChannel);
    if (searchText) msgs = msgs.filter((m) => m.text.toLowerCase().includes(searchText.toLowerCase()) || m.sender.toLowerCase().includes(searchText.toLowerCase()));
    return msgs;
  }, [messages, activeChannel, searchText]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [channelMessages]);

  const switchChannel = useCallback((id: string) => {
    setActiveChannel(id); setShowMobileSidebar(false);
    setChannels(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c));
    setDms(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c));
  }, []);

  const handleFileAttach = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const sizeStr = file.size >= 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(0)} KB`;
      const ext = file.name.split(".").pop()?.toLowerCase() || "txt";
      const docType = (["pdf"].includes(ext) ? "pdf" : ["xlsx","xls"].includes(ext) ? "xlsx" : ["docx","doc"].includes(ext) ? "docx" : ["png"].includes(ext) ? "png" : ["jpg","jpeg"].includes(ext) ? "jpg" : "txt") as any;

      // Add message with attachment
      const newMsg: Message = {
        id: `m-${Date.now()}-${file.name}`, sender: "You", avatar: "YO",
        time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        text: `📎 Shared a file: ${file.name}`, channel: activeChannel,
        attachment: { name: file.name, size: sizeStr, type: ext },
      };
      setMessages(prev => [...prev, newMsg]);

      // Also add to shared documents under /Chat Attachments
      addDocument({
        name: file.name, type: docType, size: sizeStr,
        modified: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        author: "You", folder: "/Chat Attachments", source: `Chat: #${activeChannelData?.name || activeChannel}`,
      });
    });
  }, [activeChannel, activeChannelData, addDocument]);

  const sendMessage = useCallback(() => {
    if (!inputText.trim()) return;
    const newMsg: Message = {
      id: `m-${Date.now()}`, sender: "You", avatar: "YO",
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      text: inputText, channel: activeChannel, replyTo: replyTo?.id,
    };
    setMessages(prev => [...prev, newMsg]);
    setInputText(""); setReplyTo(null);

    if (activeChannel.startsWith("dm-")) {
      const dmName = activeChannelData?.name || "Someone";
      setTimeout(() => {
        const responses = ["Got it, I'll look into that right away.", "Thanks for the update! Let me get back to you.", "Sounds good. I'll send the details shortly.", "Understood. I'll coordinate with the team on this."];
        const resp: Message = {
          id: `m-${Date.now() + 1}`, sender: dmName,
          avatar: dmName.split(" ").map(n => n[0]).join(""),
          time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
          text: responses[Math.floor(Math.random() * responses.length)], channel: activeChannel,
        };
        setMessages(prev => [...prev, resp]);
        addNotification({ type: "chat", title: `${dmName} replied to your message`, message: resp.text, link: "/chat" });
      }, 2000 + Math.random() * 2000);
    }
  }, [inputText, activeChannel, replyTo, activeChannelData, addNotification]);

  const addReaction = useCallback((msgId: string, emoji: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const reactions = m.reactions || [];
      const existing = reactions.find(r => r.emoji === emoji);
      if (existing) {
        if (existing.reacted) return { ...m, reactions: reactions.map(r => r.emoji === emoji ? { ...r, count: r.count - 1, reacted: false } : r).filter(r => r.count > 0) };
        return { ...m, reactions: reactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, reacted: true } : r) };
      }
      return { ...m, reactions: [...reactions, { emoji, count: 1, reacted: true }] };
    }));
    setShowEmojiPicker(null);
  }, []);

  const deleteMessage = useCallback((msgId: string) => { setMessages(prev => prev.filter(m => m.id !== msgId)); }, []);
  const togglePin = useCallback((msgId: string) => { setMessages(prev => prev.map(m => m.id === msgId ? { ...m, pinned: !m.pinned } : m)); }, []);
  const startEdit = useCallback((msg: Message) => { setEditingMsg(msg.id); setEditText(msg.text); }, []);
  const saveEdit = useCallback((msgId: string) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: editText, edited: true } : m));
    setEditingMsg(null); setEditText("");
  }, [editText]);

  const createChannel = useCallback(() => {
    if (!newChannelName.trim()) return;
    const id = newChannelName.toLowerCase().replace(/\s+/g, "-");
    setChannels(prev => [...prev, { id, name: id, type: "channel", unread: 0, members: 1, description: "New channel" }]);
    setActiveChannel(id); setNewChannelName(""); setShowNewChannel(false);
    addNotification({ type: "chat", title: `Channel #${id} created`, message: "You created a new channel", link: "/chat" });
  }, [newChannelName, addNotification]);

  const toggleMute = useCallback(() => {
    const ch = [...channels, ...dms].find(c => c.id === activeChannel);
    if (!ch) return;
    if (ch.type === "channel") setChannels(prev => prev.map(c => c.id === activeChannel ? { ...c, muted: !c.muted } : c));
    else setDms(prev => prev.map(c => c.id === activeChannel ? { ...c, muted: !c.muted } : c));
  }, [activeChannel, channels, dms]);

  const pinnedMessages = channelMessages.filter(m => m.pinned);
  const totalUnread = channels.reduce((s, c) => s + c.unread, 0) + dms.reduce((s, c) => s + c.unread, 0);

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-3.5rem)] lg:h-screen -m-4 sm:-m-6 lg:-m-8">
        <div className={`${showMobileSidebar ? "fixed inset-0 z-50 bg-background/80 lg:relative lg:bg-transparent" : "hidden lg:flex"} lg:flex`}>
          <div className="w-64 h-full border-r border-border bg-muted/30 flex flex-col shrink-0">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Messages {totalUnread > 0 && <span className="text-xs text-primary">({totalUnread})</span>}</h3>
              <div className="flex items-center gap-1">
                <button onClick={() => setShowNewChannel(true)} className="p-1.5 rounded-md hover:bg-muted"><Plus className="w-4 h-4 text-muted-foreground" /></button>
                <button onClick={() => setShowMobileSidebar(false)} className="p-1.5 rounded-md hover:bg-muted lg:hidden"><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 mb-1.5">Channels</p>
                {channels.map(ch => (
                  <button key={ch.id} onClick={() => switchChannel(ch.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${activeChannel === ch.id ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:bg-muted/50"}`}>
                    <Hash className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{ch.name}</span>
                    {ch.muted && <BellOff className="w-3 h-3 text-muted-foreground/40 ml-auto" />}
                    {ch.unread > 0 && !ch.muted && <span className="ml-auto bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">{ch.unread}</span>}
                  </button>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 mb-1.5">Direct Messages</p>
                {dms.map(dm => (
                  <button key={dm.id} onClick={() => switchChannel(dm.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${activeChannel === dm.id ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:bg-muted/50"}`}>
                    <div className="relative shrink-0">
                      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-medium text-secondary-foreground">{dm.name.split(" ").map(n => n[0]).join("")}</div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-muted/30 ${dm.status === "online" ? "bg-success" : dm.status === "away" ? "bg-warning" : "bg-muted-foreground/30"}`} />
                    </div>
                    <span className="truncate">{dm.name}</span>
                    {dm.unread > 0 && <span className="ml-auto bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">{dm.unread}</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-14 border-b border-border px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button onClick={() => setShowMobileSidebar(true)} className="lg:hidden p-1.5 rounded-md hover:bg-muted mr-1"><MessageSquare className="w-4 h-4 text-muted-foreground" /></button>
              {activeChannelData?.type === "channel" ? <Hash className="w-4 h-4 text-muted-foreground" /> :
                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-medium text-secondary-foreground">{activeChannelData?.name.split(" ").map(n => n[0]).join("")}</div>}
              <div>
                <h2 className="font-semibold text-foreground text-sm">{activeChannelData?.name}</h2>
                {activeChannelData?.type === "channel" && <p className="text-[10px] text-muted-foreground">{activeChannelData.members} members · {activeChannelData.description}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              {activeChannelData?.type === "dm" && <>
                <button className="p-1.5 rounded-md hover:bg-muted"><Phone className="w-4 h-4" /></button>
                <button className="p-1.5 rounded-md hover:bg-muted"><Video className="w-4 h-4" /></button>
              </>}
              <button onClick={toggleMute} className="p-1.5 rounded-md hover:bg-muted">
                {activeChannelData?.muted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              </button>
              <button onClick={() => setShowSearch(!showSearch)} className="p-1.5 rounded-md hover:bg-muted"><Search className="w-4 h-4" /></button>
              <button className="p-1.5 rounded-md hover:bg-muted"><Users className="w-4 h-4" /></button>
            </div>
          </div>

          {showSearch && (
            <div className="px-4 py-2 border-b border-border animate-fade-in">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-sm">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input autoFocus value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search in conversation..." className="bg-transparent outline-none w-full text-foreground placeholder:text-muted-foreground" />
                <button onClick={() => { setShowSearch(false); setSearchText(""); }}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
            </div>
          )}

          {pinnedMessages.length > 0 && (
            <div className="px-4 py-2 border-b border-border bg-warning/5">
              <div className="flex items-center gap-2 text-xs text-warning"><Pin className="w-3.5 h-3.5" /><span className="font-medium">{pinnedMessages.length} pinned</span></div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {channelMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquare className="w-12 h-12 mb-3 opacity-30" /><p className="text-sm font-medium">No messages yet</p><p className="text-xs mt-1">Start the conversation!</p>
              </div>
            ) : channelMessages.map(msg => {
              const replyMsg = msg.replyTo ? messages.find(m => m.id === msg.replyTo) : null;
              return (
                <div key={msg.id} className={`flex gap-3 group ${msg.sender === "You" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${msg.sender === "You" ? "bg-primary text-primary-foreground" : msg.sender === "System" ? "bg-warning/20 text-warning" : "bg-secondary text-secondary-foreground"}`}>
                    {msg.avatar}
                  </div>
                  <div className={`max-w-[70%] ${msg.sender === "You" ? "text-right" : ""}`}>
                    <div className={`flex items-center gap-2 ${msg.sender === "You" ? "justify-end" : ""}`}>
                      <span className="text-sm font-medium text-foreground">{msg.sender}</span>
                      <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                      {msg.pinned && <Pin className="w-3 h-3 text-warning" />}
                      {msg.edited && <span className="text-[10px] text-muted-foreground">(edited)</span>}
                    </div>
                    {replyMsg && (
                      <div className={`text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded mt-1 border-l-2 border-primary ${msg.sender === "You" ? "text-right" : ""}`}>
                        ↩ {replyMsg.sender}: {replyMsg.text.slice(0, 60)}...
                      </div>
                    )}
                    <div className="relative">
                      {editingMsg === msg.id ? (
                        <div className="flex gap-1 mt-1">
                          <input value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEdit(msg.id)}
                            className="flex-1 text-sm p-2 rounded-lg border border-input bg-background text-foreground outline-none" autoFocus />
                          <button onClick={() => saveEdit(msg.id)} className="p-1.5 rounded bg-primary text-primary-foreground text-xs">Save</button>
                          <button onClick={() => setEditingMsg(null)} className="p-1.5 rounded bg-muted text-xs">Cancel</button>
                        </div>
                      ) : (
                        <>
                          <p className={`text-sm mt-1 p-3 rounded-xl ${msg.sender === "You" ? "bg-primary/10 text-foreground rounded-tr-sm" : msg.sender === "System" ? "bg-warning/10 text-foreground border border-warning/20 rounded-tl-sm" : "bg-muted text-foreground rounded-tl-sm"}`}>
                            {msg.text}
                          </p>
                          {msg.attachment && (
                            <div className={`mt-1 flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border text-xs ${msg.sender === "You" ? "justify-end" : ""}`}>
                              <FileText className="w-4 h-4 text-primary" />
                              <span className="text-foreground font-medium">{msg.attachment.name}</span>
                              <span className="text-muted-foreground">{msg.attachment.size}</span>
                            </div>
                          )}
                        </>
                      )}
                      <div className={`absolute top-0 ${msg.sender === "You" ? "-left-24" : "-right-24"} hidden group-hover:flex items-center gap-0.5 bg-card border border-border rounded-lg p-0.5 shadow-md z-10`}>
                        <button onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)} className="p-1 rounded hover:bg-muted"><Smile className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        <button onClick={() => setReplyTo(msg)} className="p-1 rounded hover:bg-muted"><MessageSquare className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        <button onClick={() => togglePin(msg.id)} className="p-1 rounded hover:bg-muted"><Pin className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        {msg.sender === "You" && <>
                          <button onClick={() => startEdit(msg)} className="p-1 rounded hover:bg-muted"><Edit2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                          <button onClick={() => deleteMessage(msg.id)} className="p-1 rounded hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                        </>}
                      </div>
                      {showEmojiPicker === msg.id && (
                        <div className={`absolute top-8 ${msg.sender === "You" ? "right-0" : "left-0"} bg-card border border-border rounded-lg p-2 shadow-lg z-10 flex gap-1 animate-fade-in`}>
                          {emojiList.map(e => <button key={e} onClick={() => addReaction(msg.id, e)} className="text-lg hover:scale-125 transition-transform p-0.5">{e}</button>)}
                        </div>
                      )}
                    </div>
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className={`flex gap-1.5 mt-1.5 ${msg.sender === "You" ? "justify-end" : ""}`}>
                        {msg.reactions.map(r => (
                          <button key={r.emoji} onClick={() => addReaction(msg.id, r.emoji)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${r.reacted ? "bg-primary/10 border border-primary/30" : "bg-muted hover:bg-muted/80"}`}>
                            <span>{r.emoji}</span><span className="text-muted-foreground font-medium">{r.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {replyTo && (
            <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center gap-2 animate-fade-in">
              <MessageSquare className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">Replying to <strong className="text-foreground">{replyTo.sender}</strong>: {replyTo.text.slice(0, 50)}...</span>
              <button onClick={() => setReplyTo(null)} className="ml-auto p-0.5"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
            </div>
          )}

          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2 bg-muted rounded-xl px-4 py-3">
              <button onClick={() => fileInputRef.current?.click()} className="shrink-0">
                <Paperclip className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground" />
              </button>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleFileAttach(e.target.files)} />
              <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder={`Message ${activeChannelData?.type === "channel" ? "#" : ""}${activeChannelData?.name || ""}...`}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-w-0" />
              <Smile className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground shrink-0" />
              <button onClick={sendMessage} disabled={!inputText.trim()} className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center hover:opacity-90 disabled:opacity-40 shrink-0">
                <Send className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showNewChannel && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowNewChannel(false)}>
          <div className="glass-card rounded-2xl p-6 max-w-sm w-full animate-fade-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Create Channel</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Channel Name</label>
                <div className="flex items-center gap-2 mt-1">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  <input value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createChannel()}
                    placeholder="e.g. project-alpha" className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowNewChannel(false)} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
              <button onClick={createChannel} disabled={!newChannelName.trim()} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">Create</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
