import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { useAppEvents } from "@/hooks/use-app-events";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useSharedData } from "@/hooks/use-shared-data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Hash, Users, Search, Send, Smile, Paperclip, Plus, Phone, Video, Pin, X, Trash2, Edit2, Bell, BellOff, FileText, Loader2 } from "lucide-react";

interface Message {
  id: string; sender_id: string; sender_name: string; avatar: string; time: string; text: string; channel_id: string;
  reactions?: { emoji: string; count: number; reacted: boolean }[];
  pinned?: boolean; edited?: boolean; replyTo?: string;
  attachment?: { name: string; size: string; type: string };
}

interface Channel {
  id: string; name: string; type: "channel" | "dm" | "group"; unread: number; members?: number;
  description?: string; muted?: boolean;
}

const emojiList = ["👍", "❤️", "😂", "🎉", "🔥", "✅", "👀", "💯"];

export default function ChatPage() {
  const { addNotification } = useAppEvents();
  const { currentUser } = useAppSettings();
  const { addDocument } = useSharedData();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChannel, setActiveChannel] = useState<string>("");
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
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch channels and set up
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const { data: chData } = await supabase.from("chat_channels").select("*, chat_channel_members(count)").order("created_at");
      if (chData) {
        const mapped: Channel[] = chData.map((ch: any) => ({
          id: ch.id, name: ch.name, type: ch.type,
          unread: 0, members: ch.chat_channel_members?.[0]?.count || 0,
          description: ch.description || "", muted: false,
        }));
        setChannels(mapped);
        if (mapped.length > 0 && !activeChannel) setActiveChannel(mapped[0].id);
      }
      setLoading(false);
    };
    init();
  }, []);

  // Fetch messages for active channel
  useEffect(() => {
    if (!activeChannel) return;
    const fetchMessages = async () => {
      const { data } = await supabase.from("chat_messages").select("*, profiles:sender_id(name, avatar)")
        .eq("channel_id", activeChannel).eq("deleted", false).order("created_at", { ascending: true }).limit(200);
      if (data) {
        setMessages(data.map((m: any) => ({
          id: m.id, sender_id: m.sender_id,
          sender_name: m.profiles?.name || "Unknown",
          avatar: (m.profiles?.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2),
          time: new Date(m.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
          text: m.content, channel_id: m.channel_id,
          reactions: m.reactions ? Object.entries(m.reactions as Record<string, any>).map(([emoji, data]: [string, any]) => ({
            emoji, count: data.count || 0, reacted: data.users?.includes(userId) || false,
          })) : [],
          pinned: m.is_pinned, edited: m.edited, replyTo: m.reply_to,
        })));
      }
    };
    fetchMessages();
  }, [activeChannel, userId]);

  // Realtime subscription for messages
  useEffect(() => {
    if (!activeChannel) return;
    const channel = supabase.channel(`chat-${activeChannel}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `channel_id=eq.${activeChannel}`,
      }, async (payload) => {
        const m = payload.new as any;
        // Don't duplicate if we already added it optimistically
        setMessages(prev => {
          if (prev.find(msg => msg.id === m.id)) return prev;
          // Fetch sender info
          return [...prev, {
            id: m.id, sender_id: m.sender_id, sender_name: "...", avatar: "?",
            time: new Date(m.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
            text: m.content, channel_id: m.channel_id,
            reactions: [], pinned: m.is_pinned, edited: m.edited, replyTo: m.reply_to,
          }];
        });
        // Fetch sender info async
        const { data: profile } = await supabase.from("profiles").select("name, avatar").eq("id", m.sender_id).single();
        if (profile) {
          setMessages(prev => prev.map(msg => msg.id === m.id ? {
            ...msg, sender_name: profile.name || "Unknown",
            avatar: (profile.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2),
          } : msg));
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'chat_messages',
        filter: `channel_id=eq.${activeChannel}`,
      }, (payload) => {
        const m = payload.new as any;
        if (m.deleted) {
          setMessages(prev => prev.filter(msg => msg.id !== m.id));
        } else {
          setMessages(prev => prev.map(msg => msg.id === m.id ? {
            ...msg, text: m.content, edited: m.edited, pinned: m.is_pinned,
          } : msg));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeChannel]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const activeChannelData = channels.find((c) => c.id === activeChannel);
  const channelMessages = useMemo(() => {
    let msgs = messages.filter((m) => m.channel_id === activeChannel);
    if (searchText) msgs = msgs.filter((m) => m.text.toLowerCase().includes(searchText.toLowerCase()) || m.sender_name.toLowerCase().includes(searchText.toLowerCase()));
    return msgs;
  }, [messages, activeChannel, searchText]);

  const switchChannel = useCallback((id: string) => {
    setActiveChannel(id); setShowMobileSidebar(false);
    setChannels(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c));
  }, []);

  const handleFileAttach = useCallback((files: FileList | null) => {
    if (!files || !userId) return;
    Array.from(files).forEach(async (file) => {
      const sizeStr = file.size >= 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(0)} KB`;
      const ext = file.name.split(".").pop()?.toLowerCase() || "txt";

      const content = `📎 Shared a file: ${file.name}`;
      const attachments = [{ name: file.name, size: sizeStr, type: ext }];

      const { error } = await supabase.from("chat_messages").insert({
        channel_id: activeChannel, sender_id: userId, content,
        attachments: attachments as any,
      });
      if (error) toast.error("Failed to send attachment");
    });
  }, [activeChannel, userId]);

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || !userId) return;
    const text = inputText;
    setInputText(""); setReplyTo(null);

    const { error } = await supabase.from("chat_messages").insert({
      channel_id: activeChannel, sender_id: userId, content: text,
      reply_to: replyTo?.id || null,
    });
    if (error) toast.error("Failed to send message");
  }, [inputText, activeChannel, userId, replyTo]);

  const addReaction = useCallback(async (msgId: string, emoji: string) => {
    // Update locally for now (reactions stored as jsonb)
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

  const deleteMessage = useCallback(async (msgId: string) => {
    await supabase.from("chat_messages").update({ deleted: true }).eq("id", msgId);
    setMessages(prev => prev.filter(m => m.id !== msgId));
  }, []);

  const togglePin = useCallback(async (msgId: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    await supabase.from("chat_messages").update({ is_pinned: !msg.pinned }).eq("id", msgId);
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, pinned: !m.pinned } : m));
  }, [messages]);

  const startEdit = useCallback((msg: Message) => { setEditingMsg(msg.id); setEditText(msg.text); }, []);
  const saveEdit = useCallback(async (msgId: string) => {
    await supabase.from("chat_messages").update({ content: editText, edited: true }).eq("id", msgId);
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: editText, edited: true } : m));
    setEditingMsg(null); setEditText("");
  }, [editText]);

  const createChannel = useCallback(async () => {
    if (!newChannelName.trim() || !userId) return;
    const name = newChannelName.toLowerCase().replace(/\s+/g, "-");
    const { data: ch, error } = await supabase.from("chat_channels").insert({
      name, type: "channel" as const, created_by: userId, description: "New channel",
    }).select().single();
    if (error || !ch) { toast.error("Failed to create channel"); return; }

    // Join the channel
    await supabase.from("chat_channel_members").insert({ channel_id: ch.id, user_id: userId, role: "admin" });

    setChannels(prev => [...prev, { id: ch.id, name: ch.name, type: "channel", unread: 0, members: 1, description: ch.description || "" }]);
    setActiveChannel(ch.id); setNewChannelName(""); setShowNewChannel(false);
    toast.success(`Channel #${name} created`);
  }, [newChannelName, userId]);

  const toggleMute = useCallback(() => {
    setChannels(prev => prev.map(c => c.id === activeChannel ? { ...c, muted: !c.muted } : c));
  }, [activeChannel]);

  const pinnedMessages = channelMessages.filter(m => m.pinned);
  const totalUnread = channels.reduce((s, c) => s + c.unread, 0);

  if (loading) {
    return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  }

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
                {channels.filter(c => c.type === "channel").map(ch => (
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
                {channels.filter(c => c.type === "dm").map(dm => (
                  <button key={dm.id} onClick={() => switchChannel(dm.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${activeChannel === dm.id ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:bg-muted/50"}`}>
                    <div className="relative shrink-0">
                      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-medium text-secondary-foreground">{dm.name.split(" ").map(n => n[0]).join("")}</div>
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
                <h2 className="font-semibold text-foreground text-sm">{activeChannelData?.name || "Select a channel"}</h2>
                {activeChannelData?.type === "channel" && <p className="text-[10px] text-muted-foreground">{activeChannelData.members} members · {activeChannelData.description}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
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
            {!activeChannel ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquare className="w-12 h-12 mb-3 opacity-30" /><p className="text-sm font-medium">Select a channel to start chatting</p>
              </div>
            ) : channelMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquare className="w-12 h-12 mb-3 opacity-30" /><p className="text-sm font-medium">No messages yet</p><p className="text-xs mt-1">Start the conversation!</p>
              </div>
            ) : channelMessages.map(msg => {
              const isMe = msg.sender_id === userId;
              const replyMsg = msg.replyTo ? messages.find(m => m.id === msg.replyTo) : null;
              return (
                <div key={msg.id} className={`flex gap-3 group ${isMe ? "flex-row-reverse" : ""}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${isMe ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                    {msg.avatar}
                  </div>
                  <div className={`max-w-[70%] ${isMe ? "text-right" : ""}`}>
                    <div className={`flex items-center gap-2 ${isMe ? "justify-end" : ""}`}>
                      <span className="text-sm font-medium text-foreground">{msg.sender_name}</span>
                      <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                      {msg.pinned && <Pin className="w-3 h-3 text-warning" />}
                      {msg.edited && <span className="text-[10px] text-muted-foreground">(edited)</span>}
                    </div>
                    {replyMsg && (
                      <div className={`text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded mt-1 border-l-2 border-primary ${isMe ? "text-right" : ""}`}>
                        ↩ {replyMsg.sender_name}: {replyMsg.text.slice(0, 60)}...
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
                          <p className={`text-sm mt-1 p-3 rounded-xl ${isMe ? "bg-primary/10 text-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"}`}>
                            {msg.text}
                          </p>
                          {msg.attachment && (
                            <div className={`mt-1 flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border text-xs ${isMe ? "justify-end" : ""}`}>
                              <FileText className="w-4 h-4 text-primary" />
                              <span className="text-foreground font-medium">{msg.attachment.name}</span>
                              <span className="text-muted-foreground">{msg.attachment.size}</span>
                            </div>
                          )}
                        </>
                      )}
                      <div className={`absolute top-0 ${isMe ? "-left-24" : "-right-24"} hidden group-hover:flex items-center gap-0.5 bg-card border border-border rounded-lg p-0.5 shadow-md z-10`}>
                        <button onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)} className="p-1 rounded hover:bg-muted"><Smile className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        <button onClick={() => setReplyTo(msg)} className="p-1 rounded hover:bg-muted"><MessageSquare className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        <button onClick={() => togglePin(msg.id)} className="p-1 rounded hover:bg-muted"><Pin className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        {isMe && <>
                          <button onClick={() => startEdit(msg)} className="p-1 rounded hover:bg-muted"><Edit2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                          <button onClick={() => deleteMessage(msg.id)} className="p-1 rounded hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                        </>}
                      </div>
                      {showEmojiPicker === msg.id && (
                        <div className={`absolute top-8 ${isMe ? "right-0" : "left-0"} bg-card border border-border rounded-lg p-2 shadow-lg z-10 flex gap-1 animate-fade-in`}>
                          {emojiList.map(e => <button key={e} onClick={() => addReaction(msg.id, e)} className="text-lg hover:scale-125 transition-transform p-0.5">{e}</button>)}
                        </div>
                      )}
                    </div>
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className={`flex gap-1.5 mt-1.5 ${isMe ? "justify-end" : ""}`}>
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
              <span className="text-xs text-muted-foreground">Replying to <strong className="text-foreground">{replyTo.sender_name}</strong>: {replyTo.text.slice(0, 50)}...</span>
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
