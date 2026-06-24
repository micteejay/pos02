import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { useAppEvents } from "@/hooks/use-app-events";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Hash, Users, Search, Send, Smile, Paperclip, Plus, Pin, X, Trash2, Edit2, Bell, BellOff, FileText, Loader2, UserPlus, Check, Download, Image, Eye } from "lucide-react";
import EmptyState from "@/components/EmptyState";

interface Message {
  id: string; sender_id: string; sender_name: string; avatar: string; time: string; text: string; channel_id: string;
  reactions?: { emoji: string; count: number; reacted: boolean }[];
  pinned?: boolean; edited?: boolean; replyTo?: string;
  attachment?: { name: string; size: string; type: string; storagePath?: string; storageBucket?: string };
  dateStr?: string;
}

interface Channel {
  id: string; name: string; type: "channel" | "dm" | "group"; unread: number; members?: number;
  description?: string; muted?: boolean;
}

interface UserProfile {
  id: string; name: string; email: string; avatar: string; status: string; role?: string;
}

const emojiList = ["👍", "❤️", "😂", "🎉", "🔥", "✅", "👀", "💯"];

type CreateMode = "channel" | "dm" | "group" | null;

export default function ChatPage() {
  const { user: authUser } = useAuth();
  const { addNotification } = useAppEvents();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChannel, setActiveChannelRaw] = useState<string>(() => localStorage.getItem("chat_active_channel") || "");
  const setActiveChannel = (id: string) => { setActiveChannelRaw(id); localStorage.setItem("chat_active_channel", id); };
  const [inputText, setInputText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>(null);
  const [newChannelName, setNewChannelName] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [editingMsg, setEditingMsg] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch channels, users, and set up
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      // Fetch channels the user is a member of (for DMs/groups) plus public channels
      const { data: myMemberChannels } = await supabase.from("chat_channel_members").select("channel_id").eq("user_id", user.id);
      const myChannelIds = myMemberChannels?.map(m => m.channel_id) || [];

      // Fetch public channels + channels user is member of
      let chData: any[] = [];
      if (myChannelIds.length > 0) {
        const { data } = await supabase.from("chat_channels").select("*, chat_channel_members(count)").in("id", myChannelIds).order("created_at");
        chData = data || [];
      }
      // Also fetch public (non-private) channels
      const { data: publicCh } = await supabase.from("chat_channels").select("*, chat_channel_members(count)").eq("type", "channel").eq("is_private", false).order("created_at");
      if (publicCh) {
        const existingIds = new Set(chData.map(c => c.id));
        publicCh.forEach(ch => { if (!existingIds.has(ch.id)) chData.push(ch); });
      }

      // Fetch all channel members to resolve DM display names
      const { data: memberData } = await supabase.from("chat_channel_members").select("channel_id, user_id");

      // Fetch all profiles
      const { data: profilesData } = await supabase.from("profiles").select("id, name, email, avatar, status");

      // Fetch roles for each user
      const { data: rolesData } = await supabase.from("user_roles").select("user_id, roles(name)");
      const roleMap = new Map<string, string>();
      if (rolesData) {
        rolesData.forEach((ur: any) => {
          if (ur.roles?.name) roleMap.set(ur.user_id, ur.roles.name);
        });
      }

      const profileMap = new Map<string, UserProfile>();
      if (profilesData) {
        const users: UserProfile[] = profilesData.map(p => ({
          id: p.id,
          name: p.name || p.email?.split("@")[0] || "User",
          email: p.email || "",
          avatar: (p.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
          status: p.status || "active",
          role: roleMap.get(p.id) || "Viewer",
        }));
        users.forEach(u => profileMap.set(u.id, u));
        setAllUsers(users.filter(u => u.id !== user.id));
      }

      // Build member-to-channel mapping for DM name resolution
      const channelMembers = new Map<string, string[]>();
      if (memberData) {
        memberData.forEach((m: any) => {
          const arr = channelMembers.get(m.channel_id) || [];
          arr.push(m.user_id);
          channelMembers.set(m.channel_id, arr);
        });
      }

      if (chData && chData.length > 0) {
        const mapped: Channel[] = chData.map((ch: any) => {
          let displayName = ch.name;
          // For DMs, show the other person's name
          if (ch.type === "dm") {
            const members = channelMembers.get(ch.id) || [];
            const otherUserId = members.find((id: string) => id !== user.id);
            if (otherUserId && profileMap.has(otherUserId)) {
              displayName = profileMap.get(otherUserId)!.name;
            }
          }
          // For groups, show the channel name or member names
          if (ch.type === "group" && ch.name.startsWith("group-")) {
            const members = channelMembers.get(ch.id) || [];
            const names = members.filter(id => id !== user.id).map(id => profileMap.get(id)?.name || "User").slice(0, 3);
            displayName = names.join(", ") || ch.name;
          }
          return {
            id: ch.id, name: displayName, type: ch.type,
            unread: 0, members: ch.chat_channel_members?.[0]?.count || 0,
            description: ch.description || "", muted: false,
          };
        });
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
      const { data: rawMessages, error: msgError } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("channel_id", activeChannel)
        .eq("deleted", false)
        .order("created_at", { ascending: true })
        .limit(200);

      if (msgError) {
        console.error("Failed to load chat messages:", msgError);
        setMessages([]);
        return;
      }

      const senderIds = [...new Set((rawMessages || []).map((m: any) => m.sender_id).filter(Boolean))];
      const profileMap = new Map<string, { name: string | null; avatar: string | null }>();

      if (senderIds.length > 0) {
        const { data: senderProfiles } = await supabase
          .from("profiles")
          .select("id, name, avatar")
          .in("id", senderIds);

        (senderProfiles || []).forEach((p: any) => {
          profileMap.set(p.id, { name: p.name, avatar: p.avatar });
        });
      }

      setMessages((rawMessages || []).map((m: any) => {
        const senderProfile = profileMap.get(m.sender_id);
        const senderName = senderProfile?.name || "Unknown";

        const att = Array.isArray(m.attachments) && m.attachments.length > 0 ? m.attachments[0] : null;
        return {
          id: m.id,
          sender_id: m.sender_id,
          sender_name: senderName,
          avatar: senderName.split(" ").map((n: string) => n[0]).join("").slice(0, 2),
          time: new Date(m.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
          dateStr: new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          text: m.content,
          channel_id: m.channel_id,
          reactions: m.reactions
            ? Object.entries(m.reactions as Record<string, any>).map(([emoji, data]: [string, any]) => ({
                emoji,
                count: data.count || 0,
                reacted: data.users?.includes(userId) || false,
              }))
            : [],
          pinned: m.is_pinned,
          edited: m.edited,
          replyTo: m.reply_to,
          attachment: att ? { name: att.name, size: att.size, type: att.type, storagePath: att.storagePath, storageBucket: att.storageBucket } : undefined,
        };
      }));
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
        setMessages(prev => {
          if (prev.find(msg => msg.id === m.id)) return prev;
          return [...prev, {
            id: m.id, sender_id: m.sender_id, sender_name: "...", avatar: "?",
            time: new Date(m.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
            dateStr: new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            text: m.content, channel_id: m.channel_id,
            reactions: [], pinned: m.is_pinned, edited: m.edited, replyTo: m.reply_to,
          }];
        });
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
      const storagePath = `${userId}/${Date.now()}-${file.name}`;

      // Upload file to chat-attachments bucket
      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(storagePath, file, { upsert: false });

      if (uploadError) {
        toast.error(`Failed to upload ${file.name}`);
        return;
      }

      const content = `📎 Shared a file: ${file.name}`;
      const attachments = [{ name: file.name, size: sizeStr, type: ext, storagePath, storageBucket: "chat-attachments" }];

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

  const downloadAttachment = useCallback(async (attachment: Message["attachment"]) => {
    if (!attachment?.storagePath || !attachment?.storageBucket) {
      toast.error("No file available for download");
      return;
    }
    const { data, error } = await supabase.storage.from(attachment.storageBucket).download(attachment.storagePath);
    if (data && !error) {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url; a.download = attachment.name; 
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${attachment.name}`);
    } else {
      toast.error("Download failed");
    }
  }, []);

  const getAttachmentUrl = useCallback(async (attachment: Message["attachment"]): Promise<string | null> => {
    if (!attachment?.storagePath || !attachment?.storageBucket) return null;
    const { data } = await supabase.storage.from(attachment.storageBucket).createSignedUrl(attachment.storagePath, 3600);
    return data?.signedUrl || null;
  }, []);

  const isImageType = (type: string) => ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(type.toLowerCase());
  const isPdfType = (type: string) => type.toLowerCase() === "pdf";

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

  const toggleUserSelection = (uid: string) => {
    setSelectedUsers(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  // Start or open existing DM
  const startDirectMessage = useCallback(async (targetUserId: string) => {
    if (!userId) return;

    // Check if DM already exists between these two users
    const { data: myMemberships } = await supabase
      .from("chat_channel_members")
      .select("channel_id")
      .eq("user_id", userId);

    const { data: theirMemberships } = await supabase
      .from("chat_channel_members")
      .select("channel_id")
      .eq("user_id", targetUserId);

    if (myMemberships && theirMemberships) {
      const myChannelIds = new Set(myMemberships.map(m => m.channel_id));
      const sharedChannelIds = theirMemberships.filter(m => myChannelIds.has(m.channel_id)).map(m => m.channel_id);

      if (sharedChannelIds.length > 0) {
        // Check if any shared channel is a DM
        const { data: dmChannels } = await supabase
          .from("chat_channels")
          .select("id")
          .in("id", sharedChannelIds)
          .eq("type", "dm");

        if (dmChannels && dmChannels.length > 0) {
          setActiveChannel(dmChannels[0].id);
          setCreateMode(null); setSelectedUsers([]); setUserSearch("");
          setShowMobileSidebar(false);
          return;
        }
      }
    }

    // Create new DM channel
    const targetUser = allUsers.find(u => u.id === targetUserId);
    const dmName = `dm-${Date.now()}`;

    const { data: ch, error } = await supabase.from("chat_channels").insert({
      name: dmName, type: "dm" as const, created_by: userId, is_private: true,
      company_id: authUser?.companyId || null,
    }).select().single();

    if (error || !ch) { toast.error("Failed to create conversation"); return; }

    // Add both users as members
    await supabase.from("chat_channel_members").insert([
      { channel_id: ch.id, user_id: userId, role: "member" },
      { channel_id: ch.id, user_id: targetUserId, role: "member" },
    ]);

    const displayName = targetUser?.name || "User";
    setChannels(prev => [...prev, { id: ch.id, name: displayName, type: "dm", unread: 0, members: 2 }]);
    setActiveChannel(ch.id);
    setCreateMode(null); setSelectedUsers([]); setUserSearch("");
    toast.success(`Conversation with ${displayName} started`);
  }, [userId, allUsers]);

  // Create group chat
  const createGroupChat = useCallback(async () => {
    if (!userId || selectedUsers.length < 1) return;

    const groupName = newChannelName.trim() || selectedUsers.map(id => allUsers.find(u => u.id === id)?.name?.split(" ")[0]).filter(Boolean).join(", ");
    const dbName = `group-${Date.now()}`;

    const { data: ch, error } = await supabase.from("chat_channels").insert({
      name: newChannelName.trim() || dbName, type: "group" as const, created_by: userId,
      description: `Group with ${selectedUsers.length + 1} members`,
      company_id: authUser?.companyId || null,
    }).select().single();

    if (error || !ch) { toast.error("Failed to create group"); return; }

    // Add all members
    const memberInserts = [userId, ...selectedUsers].map(uid => ({
      channel_id: ch.id, user_id: uid, role: uid === userId ? "admin" : "member",
    }));
    await supabase.from("chat_channel_members").insert(memberInserts);

    setChannels(prev => [...prev, {
      id: ch.id, name: newChannelName.trim() || groupName, type: "group",
      unread: 0, members: selectedUsers.length + 1,
      description: `Group with ${selectedUsers.length + 1} members`,
    }]);
    setActiveChannel(ch.id);
    setCreateMode(null); setSelectedUsers([]); setNewChannelName(""); setUserSearch("");
    toast.success(`Group "${newChannelName.trim() || groupName}" created`);
  }, [userId, selectedUsers, newChannelName, allUsers]);

  // Create channel
  const createChannel = useCallback(async () => {
    if (!newChannelName.trim() || !userId) return;
    const name = newChannelName.toLowerCase().replace(/\s+/g, "-");
    const { data: ch, error } = await supabase.from("chat_channels").insert({
      name, type: "channel" as const, created_by: userId, description: "New channel",
      company_id: authUser?.companyId || null,
    }).select().single();
    if (error || !ch) { toast.error("Failed to create channel"); return; }

    await supabase.from("chat_channel_members").insert({ channel_id: ch.id, user_id: userId, role: "admin" });

    setChannels(prev => [...prev, { id: ch.id, name: ch.name, type: "channel", unread: 0, members: 1, description: ch.description || "" }]);
    setActiveChannel(ch.id); setNewChannelName("");
    setCreateMode(null); setUserSearch("");
    toast.success(`Channel #${name} created`);
  }, [newChannelName, userId]);

  const toggleMute = useCallback(() => {
    setChannels(prev => prev.map(c => c.id === activeChannel ? { ...c, muted: !c.muted } : c));
  }, [activeChannel]);

  const filteredUsers = useMemo(() => {
    if (!userSearch) return allUsers;
    const q = userSearch.toLowerCase();
    return allUsers.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.role || "").toLowerCase().includes(q));
  }, [allUsers, userSearch]);

  const pinnedMessages = channelMessages.filter(m => m.pinned);
  const totalUnread = channels.reduce((s, c) => s + c.unread, 0);
  const groupChannels = channels.filter(c => c.type === "group");

  // Inline attachment preview component
  function AttachmentPreview({ attachment, isMe, onDownload, onPreviewImage, getUrl, isImageType, isPdfType }: {
    attachment: Message["attachment"];
    isMe: boolean;
    onDownload: (att: Message["attachment"]) => void;
    onPreviewImage: (url: string) => void;
    getUrl: (att: Message["attachment"]) => Promise<string | null>;
    isImageType: (t: string) => boolean;
    isPdfType: (t: string) => boolean;
  }) {
    const [thumbUrl, setThumbUrl] = useState<string | null>(null);
    const [loadingThumb, setLoadingThumb] = useState(false);

    useEffect(() => {
      if (!attachment?.storagePath) return;
      if (isImageType(attachment.type) || isPdfType(attachment.type)) {
        setLoadingThumb(true);
        getUrl(attachment).then(url => { setThumbUrl(url); setLoadingThumb(false); });
      }
    }, [attachment?.storagePath]);

    if (!attachment) return null;

    // Image preview
    if (isImageType(attachment.type) && (thumbUrl || loadingThumb)) {
      return (
        <div className={`mt-1.5 max-w-[260px] ${isMe ? "ml-auto" : ""}`}>
          <div className="rounded-lg overflow-hidden border border-border bg-muted/30 relative group cursor-pointer"
            onClick={() => thumbUrl && onPreviewImage(thumbUrl)}>
            {loadingThumb ? (
              <div className="w-full h-32 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <img src={thumbUrl!} alt={attachment.name} className="w-full max-h-48 object-cover" loading="lazy" />
            )}
            <div className="absolute inset-0 bg-background/0 group-hover:bg-background/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <Eye className="w-5 h-5 text-foreground" />
            </div>
          </div>
          <div className={`flex items-center gap-2 mt-1 text-xs ${isMe ? "justify-end" : ""}`}>
            <span className="text-muted-foreground truncate">{attachment.name}</span>
            <span className="text-muted-foreground/60">{attachment.size}</span>
            <button onClick={(e) => { e.stopPropagation(); onDownload(attachment); }} className="p-0.5 rounded hover:bg-muted" title="Download">
              <Download className="w-3 h-3 text-primary" />
            </button>
          </div>
        </div>
      );
    }

    // PDF preview
    if (isPdfType(attachment.type) && thumbUrl) {
      return (
        <div className={`mt-1.5 max-w-[280px] ${isMe ? "ml-auto" : ""}`}>
          <div className="rounded-lg overflow-hidden border border-border bg-muted/30">
            <iframe src={`${thumbUrl}#toolbar=0&navpanes=0`} className="w-full h-40 pointer-events-none" title={attachment.name} />
          </div>
          <div className={`flex items-center gap-2 mt-1 text-xs ${isMe ? "justify-end" : ""}`}>
            <FileText className="w-3.5 h-3.5 text-destructive shrink-0" />
            <span className="text-muted-foreground truncate">{attachment.name}</span>
            <span className="text-muted-foreground/60">{attachment.size}</span>
            <button onClick={() => thumbUrl && window.open(thumbUrl, "_blank")} className="p-0.5 rounded hover:bg-muted" title="Open PDF">
              <Eye className="w-3 h-3 text-primary" />
            </button>
            <button onClick={() => onDownload(attachment)} className="p-0.5 rounded hover:bg-muted" title="Download">
              <Download className="w-3 h-3 text-primary" />
            </button>
          </div>
        </div>
      );
    }

    // Generic file
    return (
      <div className={`mt-1 flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border text-xs ${isMe ? "justify-end" : ""}`}>
        <FileText className="w-4 h-4 text-primary" />
        <span className="text-foreground font-medium">{attachment.name}</span>
        <span className="text-muted-foreground">{attachment.size}</span>
        {attachment.storagePath && (
          <button onClick={() => onDownload(attachment)} className="p-1 rounded-md hover:bg-muted ml-1" title="Download">
            <Download className="w-3.5 h-3.5 text-primary" />
          </button>
        )}
      </div>
    );
  }

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
              <div className="flex items-center gap-1 relative">
                <button onClick={() => setShowNewMenu(!showNewMenu)} className="p-1.5 rounded-md hover:bg-muted"><Plus className="w-4 h-4 text-muted-foreground" /></button>
                {showNewMenu && (
                  <div className="absolute top-8 right-0 bg-card border border-border rounded-lg shadow-lg z-20 w-44 py-1 animate-fade-in">
                    <button onClick={() => { setCreateMode("channel"); setShowNewMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted">
                      <Hash className="w-3.5 h-3.5 text-muted-foreground" /> New Channel
                    </button>
                    <button onClick={() => { setCreateMode("dm"); setShowNewMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted">
                      <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" /> Direct Message
                    </button>
                    <button onClick={() => { setCreateMode("group"); setShowNewMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" /> Group Chat
                    </button>
                  </div>
                )}
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
              {groupChannels.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 mb-1.5">Groups</p>
                  {groupChannels.map(gr => (
                    <button key={gr.id} onClick={() => switchChannel(gr.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${activeChannel === gr.id ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:bg-muted/50"}`}>
                      <Users className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{gr.name}</span>
                      {gr.unread > 0 && <span className="ml-auto bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">{gr.unread}</span>}
                    </button>
                  ))}
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 mb-1.5">Direct Messages</p>
                {channels.filter(c => c.type === "dm").map(dm => (
                  <button key={dm.id} onClick={() => switchChannel(dm.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${activeChannel === dm.id ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:bg-muted/50"}`}>
                    <div className="relative shrink-0">
                      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-medium text-secondary-foreground">{dm.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
                    </div>
                    <span className="truncate">{dm.name}</span>
                    {dm.unread > 0 && <span className="ml-auto bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">{dm.unread}</span>}
                  </button>
                ))}
                {channels.filter(c => c.type === "dm").length === 0 && (
                  <p className="text-[10px] text-muted-foreground/60 px-2 py-1">No conversations yet</p>
                )}
              </div>
              {/* Online users section */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 mb-1.5">People ({allUsers.length})</p>
                {allUsers.slice(0, 10).map(u => (
                  <button key={u.id} onClick={() => startDirectMessage(u.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
                    <div className="relative shrink-0">
                      <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-medium text-accent-foreground">{u.avatar}</div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-background ${u.status === "active" ? "bg-success" : "bg-muted-foreground/40"}`} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <span className="truncate block text-xs">{u.name}</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground/60">{u.role}</span>
                  </button>
                ))}
                {allUsers.length > 10 && (
                  <button onClick={() => setCreateMode("dm")} className="w-full text-[10px] text-primary hover:underline px-2 py-1">
                    View all {allUsers.length} people
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-14 border-b border-border px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button onClick={() => setShowMobileSidebar(true)} className="lg:hidden p-1.5 rounded-md hover:bg-muted mr-1"><MessageSquare className="w-4 h-4 text-muted-foreground" /></button>
              {activeChannelData?.type === "channel" ? <Hash className="w-4 h-4 text-muted-foreground" /> :
                activeChannelData?.type === "group" ? <Users className="w-4 h-4 text-muted-foreground" /> :
                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-medium text-secondary-foreground">{activeChannelData?.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>}
              <div>
                <h2 className="font-semibold text-foreground text-sm">{activeChannelData?.name || "Select a channel"}</h2>
                {activeChannelData && <p className="text-[10px] text-muted-foreground">{activeChannelData.members} members{activeChannelData.description ? ` · ${activeChannelData.description}` : ""}</p>}
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
              <div className="h-full flex items-center justify-center">
                <EmptyState icon={MessageSquare} title="Select a channel" description="Choose a channel or conversation to start chatting." />
              </div>
            ) : channelMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <EmptyState icon={MessageSquare} title="No messages yet" description="Be the first to start the conversation!" />
              </div>
            ) : channelMessages.map((msg, index) => {
              const prevMsg = index > 0 ? channelMessages[index - 1] : null;
              const showDateDivider = !prevMsg || prevMsg.dateStr !== msg.dateStr;
              const isMe = msg.sender_id === userId;
              const replyMsg = msg.replyTo ? messages.find(m => m.id === msg.replyTo) : null;
              return (
                <div key={msg.id}>
                  {showDateDivider && msg.dateStr && (
                    <div className="flex items-center justify-center my-6">
                      <div className="bg-muted px-3 py-1 rounded-full text-xs font-medium text-muted-foreground border border-border">
                        {msg.dateStr}
                      </div>
                    </div>
                  )}
                  <div className={`flex gap-3 group ${isMe ? "flex-row-reverse" : ""}`}>
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
                            <AttachmentPreview
                              attachment={msg.attachment}
                              isMe={isMe}
                              onDownload={downloadAttachment}
                              onPreviewImage={setPreviewImage}
                              getUrl={getAttachmentUrl}
                              isImageType={isImageType}
                              isPdfType={isPdfType}
                            />
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

      {/* Create modal */}
      {createMode && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { setCreateMode(null); setSelectedUsers([]); setUserSearch(""); setNewChannelName(""); }}>
          <div className="glass-card rounded-2xl p-6 max-w-md w-full animate-fade-in max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {createMode === "channel" ? "Create Channel" : createMode === "dm" ? "Direct Message" : "Create Group"}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {createMode === "channel" ? "Create a new channel for your team" : createMode === "dm" ? "Start a conversation with someone" : "Create a group chat with multiple people"}
            </p>

            {/* Channel/Group name input */}
            {(createMode === "channel" || createMode === "group") && (
              <div className="mb-3">
                <label className="text-xs font-medium text-muted-foreground">
                  {createMode === "channel" ? "Channel Name" : "Group Name (optional)"}
                </label>
                <div className="flex items-center gap-2 mt-1">
                  {createMode === "channel" ? <Hash className="w-4 h-4 text-muted-foreground" /> : <Users className="w-4 h-4 text-muted-foreground" />}
                  <input value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createMode === "channel" && createChannel()}
                    placeholder={createMode === "channel" ? "e.g. project-alpha" : "e.g. Sales Team"}
                    className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
            )}

            {/* User selection for DM and Group */}
            {(createMode === "dm" || createMode === "group") && (
              <>
                <div className="mb-3">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-sm">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search people by name, email, or role..."
                      className="bg-transparent outline-none w-full text-foreground placeholder:text-muted-foreground" autoFocus />
                  </div>
                </div>

                {/* Selected users chips (group only) */}
                {createMode === "group" && selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {selectedUsers.map(uid => {
                      const u = allUsers.find(u => u.id === uid);
                      return (
                        <span key={uid} className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {u?.name}
                          <button onClick={() => toggleUserSelection(uid)}><X className="w-3 h-3" /></button>
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto space-y-1 min-h-0 max-h-64">
                  {filteredUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No users found</p>
                  ) : filteredUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => createMode === "dm" ? startDirectMessage(u.id) : toggleUserSelection(u.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        selectedUsers.includes(u.id) ? "bg-primary/10 border border-primary/30" : "hover:bg-muted"
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-accent-foreground">{u.avatar}</div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${u.status === "active" ? "bg-success" : "bg-muted-foreground/40"}`} />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium text-foreground truncate">{u.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">{u.role}</span>
                      {createMode === "group" && selectedUsers.includes(u.id) && (
                        <Check className="w-4 h-4 text-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="flex gap-2 mt-4 pt-3 border-t border-border">
              <button onClick={() => { setCreateMode(null); setSelectedUsers([]); setUserSearch(""); setNewChannelName(""); }}
                className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
              {createMode === "channel" && (
                <button onClick={createChannel} disabled={!newChannelName.trim()}
                  className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">Create Channel</button>
              )}
              {createMode === "group" && (
                <button onClick={createGroupChat} disabled={selectedUsers.length < 1}
                  className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  Create Group ({selectedUsers.length} selected)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen image preview modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[60] bg-background/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <button onClick={() => setPreviewImage(null)} className="absolute top-4 right-4 p-2 rounded-full bg-muted/50 hover:bg-muted text-foreground z-10">
            <X className="w-6 h-6" />
          </button>
          <img src={previewImage} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </AppLayout>
  );
}
