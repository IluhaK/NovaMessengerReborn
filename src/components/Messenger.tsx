import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search as SearchIcon,
  Menu as MenuIcon,
  MoreVertical as MoreIcon,
  Send as SendIcon,
  Paperclip as AttachIcon,
  Smile as EmojiIcon,
  Settings,
  Users,
  ShieldAlert,
  LogOut,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  Info,
  Image as ImageIcon,
  ShieldCheck,
  LayoutDashboard,
  Megaphone,
  UserMinus,
  UserPlus,
  Crown,
  Server,
  Ban,
  VolumeX,
  Phone,
  Video,
  Bookmark,
  Zap,
  MessageCircle,
  Sparkles,
  Bell,
  Heart,
  Moon,
  Sun,
  Monitor,
  Lock,
  Eye,
  EyeOff,
  Key as KeyIcon,
  User,
  BadgeCheck,
  UserCog,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { generateSecret, verifySync, generateURI } from "otplib";
import { Buffer } from "buffer";

if (typeof window !== "undefined" && !window.Buffer) {
  window.Buffer = Buffer;
}
import { useAuth } from "../App";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  limit,
  setDoc,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import { Chat, Message, UserProfile, Theme, UserReport } from "../types";
import { format } from "date-fns";

import { translations, Language } from "../lib/translations";

const emojis = [
  "😂",
  "❤️",
  "🔥",
  "👍",
  "🙏",
  "🙌",
  "😎",
  "😢",
  "😍",
  "✨",
  "🚀",
  "💯",
  "🤔",
  "🎉",
  "👏",
  "👀",
  "🤣",
  "👌",
  "⚡",
  "💻",
];

const VerificationBadge = ({
  id,
  isPlus,
  role,
}: {
  id?: number;
  isPlus?: boolean;
  role?: string;
}) => {
  return (
    <div className="inline-flex items-center gap-1 ml-1.5 translate-y-[-1px]">
      {id === 1 && (
        <div
          title="Официальный аккаунт"
          className="bg-blue-500 rounded-full p-0.5 inline-flex items-center justify-center shadow-lg shadow-blue-500/40 animate-pulse"
        >
          <Check className="w-2.5 h-2.5 text-white stroke-[4]" />
        </div>
      )}
      {(role === "admin" || role === "creator" || id === 1) && (
        <div
          title="Администратор"
          className="text-red-500 inline-flex items-center justify-center drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] pointer-events-auto"
        >
          <BadgeCheck className="w-4 h-4" />
        </div>
      )}
      {isPlus && (
        <div
          title="Nova Plus"
          className="bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-full p-0.5 inline-flex items-center justify-center shadow-lg shadow-orange-500/20"
        >
          <Sparkles className="w-2.5 h-2.5 text-white" />
        </div>
      )}
    </div>
  );
};

const isOnline = (lastSeen: any) => {
  if (!lastSeen) return false;
  try {
    const lastSeenDate = lastSeen.toDate
      ? lastSeen.toDate()
      : new Date(lastSeen);
    const now = new Date();
    return now.getTime() - lastSeenDate.getTime() < 120000;
  } catch (e) {
    return false;
  }
};

const formatLastSeen = (lastSeen: any, t: any) => {
  if (!lastSeen) return t.offline;
  try {
    const date = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
    return `${t.lastSeen} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } catch (e) {
    return t.offline;
  }
};

export default function Messenger() {
  const { profile, signOut } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(
    null,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState<UserProfile | null>(null);
  const [showGroupInfo, setShowGroupInfo] = useState<Chat | null>(null);
  const [showReports, setShowReports] = useState(false);
  const [showGroupCreate, setShowGroupCreate] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [inputText, setInputText] = useState("");
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSidebarMenu, setShowSidebarMenu] = useState(false);
  const [showStore, setShowStore] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [notifications, setNotifications] = useState<
    { id: number; text: string; type: "success" | "error" | "info" }[]
  >([]);
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const addNotification = (
    text: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { id, text, type }]);
    setTimeout(
      () => setNotifications((prev) => prev.filter((n) => n.id !== id)),
      4000,
    );
  };

  const getThemeStyles = () => {
    const theme = profile?.theme || "dark";
    switch (theme) {
      case "light":
        return {
          bg: "bg-slate-50",
          text: "text-slate-900",
          card: "bg-white",
          sidebar: "bg-white border-slate-200",
          msgMe: "bg-blue-600 text-white shadow-blue-200",
          msgThem: "bg-white text-slate-800 border-slate-200 shadow-sm",
          accent: "blue",
          input: "bg-slate-100 placeholder:text-slate-400 text-slate-900",
          header: "bg-white/80 border-slate-200",
        };
      case "oled":
        return {
          bg: "bg-black text-white",
          text: "text-white",
          card: "bg-[#0a0a0a]",
          sidebar: "bg-black border-white/10",
          msgMe: "bg-blue-600 text-white shadow-blue-900/20",
          msgThem: "bg-[#121212] border-white/5 text-white",
          accent: "blue",
          input: "bg-white/5 placeholder:text-white/20 text-white",
          header: "bg-black/80 border-white/10",
        };
      case "cyber":
        return {
          bg: "bg-[#050505]",
          text: "text-[#00ff41]",
          card: "bg-[#0a0a0a]",
          sidebar: "bg-[#0a0a0a] border-[#00ff41]/20",
          msgMe:
            "bg-[#00ff41]/20 text-[#00ff41] border-[#00ff41]/50 shadow-[0_0_15px_rgba(0,255,65,0.1)]",
          msgThem: "bg-black border-[#00ff41]/10 text-[#00ff41]/80",
          accent: "green",
          input:
            "bg-black border border-[#00ff41]/20 placeholder:text-[#00ff41]/30 text-[#00ff41]",
          header: "bg-[#050505]/80 border-[#00ff41]/20",
        };
      case "sunset":
        return {
          bg: "bg-[#1a111a] text-orange-100",
          text: "text-orange-50",
          card: "bg-[#2a1d2a]",
          sidebar: "bg-[#251825] border-orange-500/20",
          msgMe:
            "bg-gradient-to-r from-orange-600 to-pink-600 text-white shadow-orange-900/20",
          msgThem: "bg-[#2a1d2a] border-white/5 text-orange-100/90",
          accent: "orange",
          input: "bg-white/5 placeholder:text-orange-900/30 text-orange-100",
          header: "bg-[#1a111a]/80 border-orange-500/20",
        };
      default:
        return {
          bg: "bg-[#0f172a]",
          text: "text-white",
          card: "bg-[#1e293b]",
          sidebar: "bg-[#0f172a] border-white/5",
          msgMe: "bg-blue-600 text-white shadow-blue-900/20",
          msgThem: "bg-white/5 border-white/10 text-white",
          accent: "blue",
          input: "bg-white/5 placeholder:text-white/20 text-white",
          header: "bg-[#0f172a]/80 border-white/5",
        };
    }
  };

  const styles = getThemeStyles();
  const lang: Language = profile?.language || "ru";
  const t = translations[lang];

  const sidebarMenuActions = [
    {
      label: t.store,
      icon: <Sparkles className="w-5 h-5" />,
      onClick: () => setShowStore(true),
    },
    {
      label: t.searchUsers,
      icon: <SearchIcon className="w-5 h-5" />,
      onClick: () => setShowUserSearch(true),
    },
    {
      label: t.createGroup,
      icon: <Users className="w-5 h-5" />,
      onClick: () => setShowGroupCreate(true),
    },
    {
      label: t.settings,
      icon: <Settings className="w-5 h-5" />,
      onClick: () => setShowSettings(true),
    },
  ];

  const addEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    setShowEmoji(false);
  };

  const handleFileUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) addNotification(`Файл ${file.name} прикреплен`, "success");
    };
    input.click();
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "system", "config"), (snap) => {
      if (snap.exists()) setSystemConfig(snap.data());
    });
    return () => unsub();
  }, []);

  // Fetch Chats and Ensure Global Chat exists
  useEffect(() => {
    if (!profile) return;

    // Ensure Global Chat exists and user is in it
    const ensureGlobalChat = async () => {
      const globalChatId = "global_chat";
      const globalChatRef = doc(db, "chats", globalChatId);
      const globalChatDoc = await getDoc(globalChatRef);

      if (!globalChatDoc.exists()) {
        await setDoc(globalChatRef, {
          id: globalChatId,
          type: "group",
          name: "Global Community",
          avatarURL: "https://api.dicebear.com/7.x/identicon/svg?seed=global",
          memberIds: [profile.uid],
          createdAt: serverTimestamp(),
          lastMessage: "Welcome to the global community!",
          lastMessageAt: serverTimestamp(),
        });
      } else {
        const data = globalChatDoc.data();
        if (!data.memberIds.includes(profile.uid)) {
          await updateDoc(globalChatRef, {
            memberIds: [...data.memberIds, profile.uid],
          });
        }
      }
    };

    ensureGlobalChat();

    const q = query(
      collection(db, "chats"),
      where("memberIds", "array-contains", profile.uid),
      orderBy("lastMessageAt", "desc"),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setChats(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Chat));
      },
      (err) => {
        // Silently handle if someone isn't allowed to read some chats
        console.error("Chat fetch error", err);
      },
    );
    return () => unsubscribe();
  }, [profile?.uid]);

  // Fetch messages and partner profile
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      setPartnerProfile(null);
      return;
    }

    if (activeChat.type === "direct" && profile) {
      const partnerId = activeChat.memberIds?.find((id) => id !== profile.uid);
      if (partnerId) {
        const unsubPartner = onSnapshot(doc(db, "users", partnerId), (snap) => {
          if (snap.exists()) setPartnerProfile(snap.data() as UserProfile);
        });
        return () => unsubPartner();
      }
    } else {
      setPartnerProfile(null);
    }
  }, [activeChat?.id, profile?.uid]);

  useEffect(() => {
    if (!activeChat) return;
    const q = query(
      collection(db, `chats/${activeChat.id}/messages`),
      orderBy("createdAt", "asc"),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setMessages(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Message),
        );
      },
      (err) =>
        handleFirestoreError(
          err,
          OperationType.GET,
          `chats/${activeChat.id}/messages`,
        ),
    );
    return () => unsubscribe();
  }, [activeChat?.id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || !activeChat || !profile) return;

    if (
      profile.isMuted &&
      (!profile.muteExpires || profile.muteExpires.toDate() > new Date())
    ) {
      addNotification(`Вы замучены. Причина: ${profile.muteReason}`, "error");
      return;
    }

    if (systemConfig?.globalChatLock && profile.role !== "creator") {
      addNotification("Включен глобальный блок сообщений", "error");
      return;
    }

    try {
      if (editingMessage) {
        await updateDoc(
          doc(db, `chats/${activeChat.id}/messages`, editingMessage.id),
          {
            text: inputText,
            editedAt: serverTimestamp(),
          },
        );
        setEditingMessage(null);
      } else {
        const msgData = {
          chatId: activeChat.id,
          senderId: profile.uid,
          senderName: profile.displayName,
          senderNumericId: profile.id || 0,
          isPlus: profile.isPlus || false,
          senderRole: profile.role || "user",
          text: inputText,
          createdAt: serverTimestamp(),
          type: "text",
        };
        await addDoc(
          collection(db, `chats/${activeChat.id}/messages`),
          msgData,
        );
        await updateDoc(doc(db, "chats", activeChat.id), {
          lastMessage: inputText,
          lastMessageAt: serverTimestamp(),
        });
      }
      setInputText("");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "messages");
    }
  };

  const createGroup = async (name: string) => {
    if (!profile) return;
    try {
      const chatRef = await addDoc(collection(db, "chats"), {
        type: "group",
        name,
        avatarURL: `https://api.dicebear.com/7.x/initials/svg?seed=${name}`,
        creatorId: profile.uid,
        memberIds: [profile.uid],
        createdAt: serverTimestamp(),
        lastMessage: "Group created",
        lastMessageAt: serverTimestamp(),
      });
      setShowGroupCreate(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "chats");
    }
  };

  const startChat = async (target: UserProfile) => {
    if (!profile) return;
    try {
      // Check if chat already exists
      const q = query(
        collection(db, "chats"),
        where("type", "==", "direct"),
        where("memberIds", "array-contains", profile.uid),
      );
      const snap = await getDocs(q);
      const existingChat = snap.docs.find((d) =>
        (d.data() as Chat).memberIds.includes(target.uid),
      );

      if (existingChat) {
        setActiveChat({ id: existingChat.id, ...existingChat.data() } as Chat);
      } else {
        const newChatRef = await addDoc(collection(db, "chats"), {
          type: "direct",
          memberIds: [profile.uid, target.uid],
          name: target.displayName,
          avatarURL: target.photoURL,
          createdAt: serverTimestamp(),
          lastMessageAt: serverTimestamp(),
          lastMessage: "Chat started",
        });
        const newChatSnap = await getDoc(newChatRef);
        setActiveChat({ id: newChatSnap.id, ...newChatSnap.data() } as Chat);
      }
      setShowUserSearch(false);
      addNotification("Chat started", "success");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "chats");
    }
  };

  const addMemberToGroup = async (target: UserProfile) => {
    if (!activeChat || activeChat.type !== "group") return;
    try {
      if (activeChat.memberIds.includes(target.uid)) {
        addNotification("User is already a member", "info");
        return;
      }
      await updateDoc(doc(db, "chats", activeChat.id), {
        memberIds: [...activeChat.memberIds, target.uid],
      });
      addNotification(`${target.displayName} added to group`, "success");
      setShowUserSearch(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, "chats");
    }
  };

  const isCreator =
    profile?.role === "creator" ||
    profile?.id === 1 ||
    String(profile?.id) === "1" ||
    profile?.email === "iluha1032020@gmail.com";
  const isAdmin = profile?.role === "admin" || isCreator;

  const getMuteStatus = () => {
    if (!profile?.isMuted) return false;
    if (!profile.muteExpires) return true;
    try {
      const expiry = profile.muteExpires.toDate
        ? profile.muteExpires.toDate()
        : new Date(profile.muteExpires);
      return expiry > new Date();
    } catch (e) {
      return true; // Assume muted if error parsing date
    }
  };
  const isMuted = getMuteStatus();

  return (
    <div
      className={`flex h-screen overflow-hidden ${styles.bg} ${styles.text} transition-colors duration-500`}
    >
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className={`px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-xl border border-white/10 ${
                n.type === "success"
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : n.type === "error"
                    ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                    : "bg-blue-500/20 text-blue-400 border-blue-500/30"
              }`}
            >
              {n.type === "success" ? (
                <Check className="w-4 h-4" />
              ) : n.type === "error" ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                <Info className="w-4 h-4" />
              )}
              <span className="text-xs font-bold uppercase tracking-widest">
                {n.text}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Sidebar */}
      <div
        className={`w-[320px] md:w-[400px] border-r flex flex-col shrink-0 transition-all z-20 relative ${styles.sidebar}`}
      >
        <div className="p-4 flex items-center gap-3">
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowSidebarMenu(!showSidebarMenu)}
              className={`p-2 rounded-xl transition-all ${showSidebarMenu ? "bg-blue-500 text-white" : profile?.theme === "light" ? "hover:bg-slate-100 text-slate-400" : "hover:bg-white/5 text-white/60"}`}
            >
              <MenuIcon className="w-6 h-6" />
            </motion.button>

            <AnimatePresence>
              {showSidebarMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  className={`absolute left-0 top-full mt-2 w-56 rounded-2xl shadow-2xl p-2 z-50 border backdrop-blur-xl ${profile?.theme === "light" ? "bg-white/90 border-slate-200" : "bg-[#1e293b]/90 border-white/10"}`}
                >
                  <div
                    className={`p-3 mb-2 border-b ${profile?.theme === "light" ? "border-slate-100" : "border-white/5"}`}
                  >
                    <div className="flex items-center">
                      <p className="font-bold text-sm truncate">
                        {profile?.displayName}
                      </p>
                      <VerificationBadge
                        id={profile?.id}
                        isPlus={profile?.isPlus}
                        role={profile?.role}
                      />
                    </div>
                    <p className="text-[10px] opacity-40 uppercase tracking-widest">
                      ID: {profile?.id}
                    </p>
                  </div>
                  {sidebarMenuActions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        action.onClick();
                        setShowSidebarMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-sm font-medium ${profile?.theme === "light" ? "hover:bg-slate-100 text-slate-800" : "hover:bg-white/10 text-white"}`}
                    >
                      <span className="text-blue-500">{action.icon}</span>
                      {action.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
            <input
              type="text"
              placeholder={t.search}
              className={`w-full rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none transition-all ${profile?.theme === "light" ? "bg-slate-100 text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-400 border-none shadow-inner" : "bg-white/5 text-white focus:bg-white/10 focus:ring-1 focus:ring-blue-500/50"}`}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-2">
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-30 p-8 text-center">
              <Users className="w-12 h-12 mb-4" />
              <p className="text-sm">{t.noChats}</p>
            </div>
          ) : (
            chats
              .filter(
                (c) =>
                  (c.name || "")
                    .toLowerCase()
                    .includes(searchText.toLowerCase()) ||
                  (c.lastMessage || "")
                    .toLowerCase()
                    .includes(searchText.toLowerCase()),
              )
              .map((chat) => (
                <motion.div
                  key={chat.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => setActiveChat(chat)}
                  className={`p-3 my-1 rounded-2xl flex items-center gap-4 cursor-pointer transition-all duration-300 relative group ${activeChat?.id === chat.id ? "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/20 text-white" : "hover:bg-white/5"}`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={
                        chat.avatarURL ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${chat.name}`
                      }
                      className="w-14 h-14 rounded-2xl object-cover shadow-lg border border-white/10"
                      alt=""
                    />
                    {/* Online status in sidebar is complex for all users, so we can hide or make it conditional if we had user info */}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center min-w-0">
                        <h3 className="font-bold truncate text-[15px] tracking-tight">
                          {chat.name}
                        </h3>
                        {/* We can't know the exact ID here easily without profile lookup, but we can assume creator of some groups */}
                      </div>
                      <span
                        className={`text-[10px] uppercase font-bold tracking-widest ${activeChat?.id === chat.id ? "text-white/60" : "text-slate-500"}`}
                      >
                        {chat.lastMessageAt?.toDate()
                          ? format(chat.lastMessageAt.toDate(), "HH:mm")
                          : ""}
                      </span>
                    </div>
                    <p
                      className={`text-[13px] truncate font-medium ${activeChat?.id === chat.id ? "text-white/70" : "text-slate-400"}`}
                    >
                      {chat.lastMessage || "Нет сообщений"}
                    </p>
                  </div>
                  {activeChat?.id === chat.id && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute left-0 w-1 h-8 bg-white rounded-r-full"
                    />
                  )}
                </motion.div>
              ))
          )}
        </div>

        <div className="p-3 grid grid-cols-4 gap-1 border-t border-white/5">
          <button
            title="Настройки"
            onClick={() => setShowSettings(true)}
            className="p-3 hover:bg-white/5 rounded-2xl flex flex-col items-center gap-1 transition-all group"
          >
            <Settings className="w-5 h-5 opacity-60 group-hover:opacity-100 group-hover:text-blue-400" />
          </button>
          <button
            title="Создать группу"
            onClick={() => setShowGroupCreate(true)}
            className="p-3 hover:bg-white/5 rounded-2xl flex flex-col items-center gap-1 transition-all group"
          >
            <Users className="w-5 h-5 opacity-60 group-hover:opacity-100 group-hover:text-green-400" />
          </button>
          {isAdmin && (
            <button
              title="Админ панель"
              onClick={() => setShowAdmin(true)}
              className="p-3 hover:bg-white/5 rounded-2xl flex flex-col items-center gap-1 transition-all group"
            >
              <ShieldAlert className="w-5 h-5 text-orange-500 opacity-60 group-hover:opacity-100" />
            </button>
          )}
          {isCreator && (
            <button
              title="Создательская панель"
              onClick={() => setShowCreator(true)}
              className="p-3 hover:bg-white/5 rounded-2xl flex flex-col items-center gap-1 transition-all group"
            >
              <UserCog className="w-5 h-5 text-yellow-500 opacity-60 group-hover:opacity-100" />
            </button>
          )}
          {isCreator && (
            <button
              title="Dev Tools"
              onClick={() => setShowDevTools(true)}
              className="p-3 hover:bg-white/5 rounded-2xl flex flex-col items-center gap-1 transition-all group"
            >
              <Server className="w-5 h-5 text-blue-400 opacity-60 group-hover:opacity-100" />
            </button>
          )}
          <button
            title="Выйти"
            onClick={signOut}
            className="p-3 hover:bg-white/5 rounded-2xl flex flex-col items-center gap-1 transition-all group"
          >
            <LogOut className="w-5 h-5 text-red-500 opacity-60 group-hover:opacity-100" />
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div
        className={`flex-1 flex flex-col relative overflow-hidden transition-all duration-500 shadow-2xl z-10 ${styles.bg}`}
      >
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              x: [0, 20, 0],
              y: [0, -20, 0],
            }}
            transition={{ duration: 20, repeat: Infinity }}
            className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] blur-[150px] rounded-full ${styles.accent === "green" ? "bg-[#00ff41]/20" : styles.accent === "orange" ? "bg-orange-500/20" : "bg-blue-600/20"}`}
          />
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              x: [0, -30, 0],
              y: [0, 30, 0],
            }}
            transition={{ duration: 15, repeat: Infinity, delay: 2 }}
            className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] blur-[150px] rounded-full ${styles.accent === "green" ? "bg-[#00ff41]/10" : styles.accent === "orange" ? "bg-pink-600/20" : "bg-indigo-600/20"}`}
          />
        </div>

        {activeChat ? (
          <>
            {/* Header */}
            <div
              className={`px-6 py-4 border-b flex items-center justify-between z-10 backdrop-blur-3xl transition-all duration-500 ${styles.header}`}
            >
              <div className="flex items-center gap-4">
                <motion.div whileHover={{ scale: 1.05 }} className="relative">
                  <img
                    src={activeChat.avatarURL}
                    className="w-12 h-12 rounded-2xl shadow-2xl object-cover cursor-pointer hover:ring-2 ring-blue-500 transition-all"
                    alt=""
                  />
                  {activeChat.type === "direct" ? (
                    <div
                      className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 ${isOnline(partnerProfile?.lastSeen) ? "bg-green-500" : "bg-slate-500"} border-4 rounded-full ${profile?.theme === "light" ? "border-white" : "border-[#0f172a]"}`}
                    />
                  ) : (
                    <div
                      className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-4 rounded-full ${profile?.theme === "light" ? "border-white" : "border-[#0f172a]"}`}
                    />
                  )}
                </motion.div>
                <div>
                  <h2 className="font-black text-xl tracking-tighter uppercase">
                    {activeChat.type === "direct"
                      ? partnerProfile?.displayName || activeChat.name
                      : activeChat.name}
                  </h2>
                  <div className="flex items-center gap-2">
                    {activeChat.type === "direct" ? (
                      isOnline(partnerProfile?.lastSeen) ? (
                        <>
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                            {t.onlineNow}
                          </p>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            {formatLastSeen(partnerProfile?.lastSeen, t)}
                          </p>
                        </>
                      )
                    ) : (
                      <>
                        <Users className="w-3 h-3 text-slate-400" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {activeChat.memberIds?.length || 1} {t.members}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {activeChat.type === "group" && (
                  <button
                    title={t.addMember}
                    onClick={() => setShowUserSearch(true)}
                    className={`p-3 rounded-2xl transition-all ${profile?.theme === "light" ? "hover:bg-green-50 text-green-600" : "hover:bg-green-500/10 text-green-500"}`}
                  >
                    <UserPlus className="w-5 h-5" />
                  </button>
                )}
                <button
                  title={isAdmin ? "Админ-действия / Инфо" : "Информация"}
                  onClick={() =>
                    partnerProfile
                      ? setShowUserInfo(partnerProfile)
                      : activeChat.type === "group"
                        ? setShowGroupInfo(activeChat)
                        : null
                  }
                  className={`p-3 rounded-2xl transition-all ${profile?.theme === "light" ? "hover:bg-slate-100 text-slate-400" : "hover:bg-white/5 text-white/40 hover:text-white"}`}
                >
                  <Info className="w-5 h-5" />
                </button>
                <div className="w-[1px] h-6 bg-white/5 mx-2 self-center block" />
                <button
                  title="Магазин Nova Plus"
                  onClick={() => setShowStore(true)}
                  className={`p-3 rounded-2xl transition-all group ${profile?.theme === "light" ? "hover:bg-blue-50 text-blue-600" : "hover:bg-blue-500/10 text-blue-500"}`}
                >
                  <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-4 custom-scrollbar z-10">
              <div className="flex-1" />
              <AnimatePresence mode="popLayout">
                {messages.map((msg, i) => {
                  const isMe = msg.senderId === profile?.uid;
                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      key={msg.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"} group`}
                    >
                      <div
                        className={`relative px-5 py-3 rounded-[24px] max-w-[70%] shadow-2xl border transition-all duration-300 ${isMe ? `rounded-br-none ${styles.msgMe}` : `rounded-bl-none ${styles.msgThem}`}`}
                      >
                        {!isMe && (
                          <div className="flex items-center gap-1 mb-1.5 min-w-0">
                            <p
                              className={`text-[10px] font-black uppercase tracking-widest truncate ${styles.accent === "green" ? "text-[#00ff41]" : "text-blue-500"}`}
                            >
                              {msg.senderName}
                            </p>
                            <VerificationBadge
                              id={(msg as any).senderNumericId}
                              isPlus={(msg as any).isPlus}
                              role={(msg as any).senderRole}
                            />
                          </div>
                        )}
                        <p className="text-[15px] leading-relaxed font-medium whitespace-pre-wrap break-words">
                          {msg.text}
                        </p>
                        <div className="flex items-center justify-end gap-2 mt-2 opacity-50">
                          {msg.editedAt && (
                            <span className="text-[9px] italic font-bold">
                              EDT
                            </span>
                          )}
                          <span className="text-[10px] font-black tracking-tighter">
                            {msg.createdAt?.toDate()
                              ? format(msg.createdAt.toDate(), "HH:mm")
                              : ""}
                          </span>
                          {isMe && (
                            <Check className="w-3.5 h-3.5 text-white/60" />
                          )}
                        </div>

                        <div
                          className={`absolute ${isMe ? "right-full mr-4" : "left-full ml-4"} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex gap-2 transition-all`}
                        >
                          {isMe && (
                            <button
                              onClick={() => {
                                setEditingMessage(msg);
                                setInputText(msg.text);
                              }}
                              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/40 hover:text-white"
                              title="Изменить"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (isMe || profile?.id === 1)
                                deleteDoc(
                                  doc(
                                    db,
                                    `chats/${activeChat.id}/messages`,
                                    msg.id,
                                  ),
                                );
                            }}
                            className="p-2 hover:bg-red-500/10 rounded-xl transition-colors text-red-500/40 hover:text-red-500"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <div className={`p-6 z-20 ${styles.bg}`}>
              <div className="max-w-5xl mx-auto flex flex-col gap-3">
                <AnimatePresence>
                  {editingMessage && (
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 20, opacity: 0 }}
                      className="flex items-center justify-between bg-blue-500/10 p-4 rounded-2xl text-xs text-blue-500 border border-blue-500/20 backdrop-blur-md"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg">
                          <Edit2 className="w-3 h-3" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black uppercase tracking-widest text-[10px]">
                            Editing Message
                          </span>
                          <span className="opacity-70 truncate max-w-[200px] md:max-w-[500px] font-medium">
                            {editingMessage.text}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setEditingMessage(null);
                          setInputText("");
                        }}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div
                  className={`flex items-center gap-3 border border-white/10 rounded-[32px] p-2 pr-5 transition-all focus-within:ring-2 focus-within:ring-blue-500/40 group relative ${styles.input}`}
                >
                  <div className="relative">
                    <button
                      onClick={() => setShowEmoji(!showEmoji)}
                      title="Смайлы"
                      className={`p-3 rounded-full transition-all ${showEmoji ? "bg-blue-600 text-white" : "hover:bg-white/5 opacity-40 hover:opacity-100"}`}
                    >
                      <EmojiIcon className="w-6 h-6" />
                    </button>

                    <AnimatePresence>
                      {showEmoji && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={`absolute bottom-full left-0 mb-4 grid grid-cols-5 gap-1 p-3 rounded-2xl shadow-2xl border backdrop-blur-xl z-50 ${profile?.theme === "light" ? "bg-white/95 border-slate-200" : "bg-[#1e293b]/95 border-white/10"}`}
                        >
                          {emojis.map((e) => (
                            <button
                              key={e}
                              onClick={() => addEmoji(e)}
                              className={`text-2xl p-2 rounded-xl transition-all hover:scale-125 ${profile?.theme === "light" ? "hover:bg-slate-100" : "hover:bg-white/10"}`}
                            >
                              {e}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button
                    onClick={handleFileUpload}
                    title="Прикрепить"
                    className="p-3 hover:bg-white/5 rounded-full transition-colors text-blue-500"
                  >
                    <AttachIcon className="w-6 h-6" />
                  </button>

                  <input
                    type="text"
                    placeholder={isMuted ? "You are muted" : t.writeMessage}
                    disabled={isMuted}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    className="flex-1 focus:outline-none text-[16px] bg-transparent py-3 px-2 font-medium"
                  />

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={sendMessage}
                    className={`p-3.5 rounded-full text-white shadow-2xl transition-all ${inputText.trim() ? "bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/50 opacity-100" : "bg-slate-700 opacity-20 cursor-default"}`}
                  >
                    <SendIcon
                      className={`w-6 h-6 transition-transform ${inputText.trim() ? "translate-x-0.5 -translate-y-0.5 rotate-[-15deg]" : ""}`}
                    />
                  </motion.button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden transition-all duration-700">
            <div className="absolute inset-0 z-0 pointer-events-none">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.1, 0.2, 0.1],
                }}
                transition={{ duration: 10, repeat: Infinity }}
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] blur-[150px] rounded-full ${
                  profile?.theme === "sunset"
                    ? "bg-orange-500"
                    : profile?.theme === "cyber"
                      ? "bg-[#00ff41]"
                      : "bg-blue-600"
                }`}
              />
            </div>

            <motion.div
              initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              className="bg-white/5 p-16 rounded-[5rem] mb-12 backdrop-blur-3xl border border-white/10 shadow-[0_0_100px_rgba(37,99,235,0.15)] relative z-10 group"
            >
              <div className="relative">
                <div
                  className={`absolute inset-0 blur-3xl opacity-30 group-hover:opacity-50 transition-opacity animate-pulse ${
                    profile?.theme === "cyber" ? "bg-[#00ff41]" : "bg-blue-500"
                  }`}
                />
                <MessageCircle
                  className={`w-24 h-24 relative transition-transform group-hover:scale-110 ${
                    profile?.theme === "cyber"
                      ? "text-[#00ff41]"
                      : "text-blue-500"
                  }`}
                />
              </div>
            </motion.div>

            <div className="relative z-10 space-y-2">
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-7xl font-black italic tracking-tighter uppercase mb-4"
              >
                Nova{" "}
                <span
                  className={
                    profile?.theme === "cyber"
                      ? "text-[#00ff41]"
                      : "text-blue-500"
                  }
                >
                  Rework
                </span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                className="text-slate-400 max-w-sm mx-auto text-[10px] font-black uppercase tracking-[0.5em] mb-12"
              >
                Neural Optical Virtual Assistant
              </motion.p>
            </div>

            <div className="flex flex-wrap justify-center gap-6 relative z-10">
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowGroupCreate(true)}
                className="px-10 py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-2xl hover:border-white/20"
              >
                Initialize Group
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSettings(true)}
                className={`px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-2xl hover:brightness-110 ${
                  profile?.theme === "cyber"
                    ? "bg-[#00ff41] text-black shadow-[#00ff41]/20"
                    : "bg-blue-600 text-white shadow-blue-500/30"
                }`}
              >
                Sync Identity
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showSettings && (
          <SettingsModal
            profile={profile}
            onClose={() => setShowSettings(false)}
          />
        )}
        {showUserInfo && (
          <UserInfoModal
            user={showUserInfo}
            profile={profile}
            onClose={() => setShowUserInfo(null)}
            addNotification={addNotification}
            isAdmin={isAdmin}
          />
        )}
        {showGroupInfo && (
          <GroupInfoModal
            chat={showGroupInfo}
            profile={profile}
            onClose={() => setShowGroupInfo(null)}
            addNotification={addNotification}
            isAdmin={isAdmin}
          />
        )}
        {showCreator && (
          <CreatorPanel
            profile={profile}
            onClose={() => setShowCreator(false)}
            addNotification={addNotification}
          />
        )}
        {showDevTools && (
          <DevToolsModal
            profile={profile}
            onClose={() => setShowDevTools(false)}
            addNotification={addNotification}
            systemConfig={systemConfig}
          />
        )}
        {showAdmin && (
          <AdminPanel
            profile={profile}
            onClose={() => setShowAdmin(false)}
            chats={chats}
            addNotification={addNotification}
          />
        )}
        {showStore && (
          <NovaStoreModal
            profile={profile}
            onClose={() => setShowStore(false)}
            addNotification={addNotification}
          />
        )}
        {showUserSearch && (
          <UserSearchModal
            onClose={() => setShowUserSearch(false)}
            profile={profile}
            addNotification={addNotification}
            onStartChat={
              activeChat?.type === "group" ? addMemberToGroup : startChat
            }
          />
        )}
        {showGroupCreate && (
          <GroupCreateModal
            profile={profile}
            onCreate={createGroup}
            onClose={() => setShowGroupCreate(false)}
          />
        )}
        {showStore && (
          <StoreModal
            onClose={() => setShowStore(false)}
            profile={profile}
            addNotification={addNotification}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StoreModal({
  onClose,
  profile,
  addNotification,
}: {
  onClose: () => void;
  profile: UserProfile | null;
  addNotification: any;
}) {
  const isLight = profile?.theme === "light";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className={`w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl border ${isLight ? "bg-white text-slate-900 border-slate-200" : "bg-[#1e293b] text-white border-white/10"}`}
      >
        <div className="flex justify-between items-center mb-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-3 rounded-2xl shadow-lg shadow-blue-500/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-black italic tracking-tighter uppercase">
              Nova Plus
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${isLight ? "hover:bg-slate-100" : "hover:bg-white/10"}`}
          >
            <X />
          </button>
        </div>

        <div
          className={`p-6 rounded-3xl mb-8 relative overflow-hidden ${isLight ? "bg-blue-50 border border-blue-200" : "bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-white/5"}`}
        >
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/20 blur-3xl rounded-full" />
          <p className="text-sm font-medium mb-6 relative z-10 opacity-80 leading-relaxed">
            Подписка{" "}
            <span className="font-extrabold text-blue-500">Nova Plus</span> —
            это ваш пропуск в мир эксклюзивных возможностей мессенджера:
          </p>

          <ul className="space-y-4 relative z-10">
            <li className="flex items-center gap-3 text-sm">
              <div className="bg-blue-500/20 p-2 rounded-lg text-blue-500">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="font-semibold">
                Приоритетная поддержка и связь с разработчиками
              </span>
            </li>
            <li className="flex items-center gap-3 text-sm">
              <div className="bg-purple-500/20 p-2 rounded-lg text-purple-500">
                <Zap className="w-4 h-4" />
              </div>
              <span className="font-semibold">
                Ранний доступ к бета-функциям
              </span>
            </li>
            <li className="flex items-center gap-3 text-sm">
              <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-500">
                <Check className="w-4 h-4" />
              </div>
              <span className="font-semibold">
                Кастомный значок в профиле (выбор из коллекции)
              </span>
            </li>
            <li className="flex items-center gap-3 text-sm">
              <div className="bg-orange-500/20 p-2 rounded-lg text-orange-500">
                <EmojiIcon className="w-4 h-4" />
              </div>
              <span className="font-semibold">
                Создание собственных наборов эмодзи
              </span>
            </li>
            <li className="flex items-center gap-3 text-sm">
              <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-500">
                <ImageIcon className="w-4 h-4" />
              </div>
              <span className="font-semibold">
                Анимированные аватары и обложки профиля
              </span>
            </li>
            <li className="flex items-center gap-3 text-sm">
              <div className="bg-rose-500/20 p-2 rounded-lg text-rose-500">
                <Users className="w-4 h-4" />
              </div>
              <span className="font-semibold">
                Увеличенный лимит участников в группах (до 5000)
              </span>
            </li>
            <li className="flex items-center gap-3 text-sm">
              <div className="bg-cyan-500/20 p-2 rounded-lg text-cyan-500">
                <AttachIcon className="w-4 h-4" />
              </div>
              <span className="font-semibold text-cyan-500">
                Загрузка файлов размером до 2 ГБ
              </span>
            </li>
            <li className="flex items-center gap-3 text-sm">
              <div className="bg-yellow-500/20 p-2 rounded-lg text-yellow-500">
                <Bell className="w-4 h-4" />
              </div>
              <span className="font-semibold">
                Эксклюзивные звуковые уведомления
              </span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <div className="text-center mb-2">
            <span className="text-2xl font-black italic">399₽</span>
            <span className="text-xs opacity-50 ml-2 uppercase tracking-widest font-bold">
              / месяц
            </span>
          </div>
          <button
            disabled
            className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 disabled:opacity-50 disabled:grayscale text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 transition-all flex justify-center items-center gap-2"
          >
            <span>Купить (скоро)</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function UserSearchModal({
  onClose,
  profile,
  addNotification,
  onStartChat,
}: {
  onClose: () => void;
  profile: UserProfile | null;
  addNotification: any;
  onStartChat: (target: UserProfile) => void;
}) {
  const [queryText, setQueryText] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const lang: Language = profile?.language || "ru";
  const t = translations[lang];

  const search = async () => {
    if (!queryText.trim()) return;
    setLoading(true);
    try {
      let q;
      // If it's a number, it might be an ID search
      if (!isNaN(Number(queryText))) {
        q = query(
          collection(db, "users"),
          where("id", "==", Number(queryText)),
        );
      } else if (queryText.startsWith("@")) {
        const handle = queryText.slice(1).toLowerCase();
        q = query(collection(db, "users"), where("handle", "==", handle));
      } else {
        q = query(
          collection(db, "users"),
          where("displayName", ">=", queryText),
          where("displayName", "<=", queryText + "\uf8ff"),
          limit(20),
        );
      }

      const snap = await getDocs(q);
      const searchResults = snap.docs
        .map((d) => d.data() as UserProfile)
        .filter((u) => u.uid !== profile?.uid);

      // If no results from name search, try handle search without @
      if (searchResults.length === 0 && !queryText.startsWith("@")) {
        const q2 = query(
          collection(db, "users"),
          where("handle", "==", queryText.toLowerCase()),
        );
        const snap2 = await getDocs(q2);
        const handleResults = snap2.docs
          .map((d) => d.data() as UserProfile)
          .filter((u) => u.uid !== profile?.uid);
        setResults(handleResults);
      } else {
        setResults(searchResults);
      }
    } catch (err) {
      console.error(err);
      addNotification("Search failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[70] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className={`w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl border ${profile?.theme === "light" ? "bg-white text-slate-900 border-slate-200" : "bg-[#1e293b] text-white border-white/10"}`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black italic tracking-tighter uppercase">
            {t.searchUsers}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${profile?.theme === "light" ? "hover:bg-slate-100" : "hover:bg-white/10"}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          <input
            autoFocus
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder={t.enterNameOrId}
            className={`flex-1 p-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold placeholder:opacity-50 ${profile?.theme === "light" ? "bg-slate-50 border-slate-200 text-slate-900 border" : "bg-white/5 border border-white/10 text-white"}`}
          />
          <button
            onClick={search}
            className="bg-blue-600 text-white px-6 rounded-2xl font-bold transition-all hover:bg-blue-500"
          >
            <SearchIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center p-8 opacity-40 font-bold uppercase tracking-widest text-[10px]">
              {t.noUsersFound}
            </div>
          ) : (
            results.map((u) => (
              <div
                key={u.uid}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all hover:scale-[1.02] ${profile?.theme === "light" ? "bg-slate-50 border-slate-200 hover:bg-white" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
              >
                <img
                  src={u.photoURL}
                  className="w-12 h-12 rounded-xl shadow-lg"
                  alt=""
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="font-bold truncate">{u.displayName}</p>
                    <VerificationBadge
                      id={u.id}
                      isPlus={u.isPlus}
                      role={u.role}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] opacity-40 uppercase tracking-widest font-black">
                      ID: {u.id}
                    </p>
                    {u.handle && (
                      <p className="text-[10px] text-blue-500 font-bold">
                        @{u.handle}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onStartChat(u)}
                  className="p-3 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-600/20 hover:scale-110 transition-transform"
                >
                  <SendIcon className="w-4 h-4 translate-x-0.5 -translate-y-0.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
function SettingsModal({
  profile,
  onClose,
}: {
  profile: UserProfile | null;
  onClose: () => void;
}) {
  const lang: Language = profile?.language || "ru";
  const t = translations[lang];

  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [handle, setHandle] = useState(profile?.handle || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [localTheme, setLocalTheme] = useState<Theme>(
    profile?.theme || "light",
  );
  const [localLang, setLocalLang] = useState<Language>(lang);
  const [error, setError] = useState("");

  const [is2FASubModal, setIs2FASubModal] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState("");
  const [twoFactorToken, setTwoFactorToken] = useState("");

  const generate2FA = () => {
    const secret = generateSecret();
    setTwoFactorSecret(secret);
  };

  const enable2FA = async () => {
    if (!twoFactorToken || !twoFactorSecret || !profile) return;
    const isValid = verifySync({
      token: twoFactorToken,
      secret: twoFactorSecret,
    });
    if (isValid) {
      try {
        await updateDoc(doc(db, "users", profile.uid), {
          twoFactorEnabled: true,
          twoFactorSecret: twoFactorSecret,
        });
        setIs2FASubModal(false);
      } catch (err) {
        setError("Error enabling 2FA");
      }
    } else {
      setError("Invalid code");
    }
  };

  const disable2FA = async () => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      });
      setIs2FASubModal(false);
    } catch (err) {
      setError("Error disabling 2FA");
    }
  };

  const save = async () => {
    if (!profile) return;

    // Nickname Rules
    const nameRegex = /^[a-zA-Z0-9_а-яА-ЯёЁ\s]{3,20}$/;
    if (!nameRegex.test(displayName.trim())) {
      setError(t.nicknameRule);
      return;
    }

    const updates: any = {
      displayName: displayName.trim(),
      bio,
      theme: localTheme,
      language: localLang,
    };

    if (handle !== profile.handle) {
      const createdAt = profile.createdAt?.toDate?.() || new Date();
      const diff =
        (new Date().getTime() - createdAt.getTime()) / (1000 * 3600 * 24);
      if (diff > 2) {
        setError(t.handleLocked);
        return;
      }

      const handleRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!handleRegex.test(handle)) {
        setError(t.handleRule);
        return;
      }

      const q = query(
        collection(db, "users"),
        where("handle", "==", handle.toLowerCase()),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setError(t.handleExists);
        return;
      }

      updates.handle = handle.toLowerCase();
    }

    try {
      await updateDoc(doc(db, "users", profile.uid), updates);
      onClose();
    } catch (err) {
      setError("Error saving profile");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className={`w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border ${profile?.theme === "light" ? "bg-white text-slate-900 border-slate-200" : "bg-[#17212b] text-white border-white/10"}`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold italic tracking-tighter uppercase">
            {t.settings}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X />
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-500 p-3 rounded-xl mb-4 text-xs font-bold border border-red-500/20">
            {error}
          </div>
        )}

        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar">
          <div className="flex flex-col items-center gap-2 mb-4">
            <div className="relative">
              <img
                src={profile?.photoURL}
                className="w-20 h-20 rounded-2xl border-2 border-blue-500 p-1 shadow-2xl object-cover"
                alt=""
              />
              <div
                className={`absolute -bottom-2 -right-2 bg-blue-600 rounded-full p-1 border-2 ${profile?.theme === "light" ? "border-white" : "border-[#17212b]"}`}
              >
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="flex items-center mt-2">
              <p className="text-xs text-blue-500 font-black uppercase tracking-[0.2em]">
                Profile ID: {profile?.id}
              </p>
              {profile?.id === 1 && (
                <div className="ml-2 px-2 py-0.5 bg-blue-500 rounded text-[8px] font-black tracking-widest text-white shadow-lg shadow-blue-500/40">
                  ORIGINAL
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2 block">
              Display Identity
            </label>
            <input
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setError("");
              }}
              placeholder="3-20 symbols"
              className={`w-full p-4 rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-blue-500 ${profile?.theme === "light" ? "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400" : "bg-white/5 border-white/10 text-white placeholder:text-white/30"}`}
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2 block">
              {t.handle}
            </label>
            <input
              value={handle}
              onChange={(e) => {
                setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""));
                setError("");
              }}
              placeholder={t.handlePlaceholder}
              className={`w-full p-4 rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-blue-500 ${profile?.theme === "light" ? "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400" : "bg-white/5 border-white/10 text-white placeholder:text-white/30"}`}
            />
            <p className="text-[9px] opacity-40 mt-1 px-2">{t.handleRule}</p>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2 block">
              {t.biography}
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className={`w-full p-4 rounded-2xl border min-h-[80px] outline-none transition-all focus:ring-2 focus:ring-blue-500 ${profile?.theme === "light" ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-white/5 border-white/10 text-white"}`}
            />
          </div>

          <div
            className={`p-4 rounded-3xl border ${profile?.theme === "light" ? "bg-blue-50 border-blue-200" : "bg-blue-600/10 border-blue-500/20"}`}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-black uppercase tracking-widest">
                  {t.twoFactor}
                </span>
              </div>
              {profile?.twoFactorEnabled ? (
                <span className="text-[9px] bg-green-500 text-white px-2 py-0.5 rounded-full font-black">
                  ACTIVE
                </span>
              ) : (
                <span className="text-[9px] bg-slate-500 text-white px-2 py-0.5 rounded-full font-black">
                  OFF
                </span>
              )}
            </div>
            <button
              onClick={() => {
                generate2FA();
                setIs2FASubModal(true);
              }}
              className="w-full py-3 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
            >
              {profile?.twoFactorEnabled ? t.disable2FA : t.setup2FA}
            </button>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">
              {t.language}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setLocalLang("ru")}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${localLang === "ru" ? "border-blue-500 bg-blue-500/10 text-blue-400 font-bold" : "border-white/5 hover:bg-white/5 opacity-60"}`}
              >
                <span className="text-[10px] uppercase tracking-widest font-black">
                  {t.russian}
                </span>
              </button>
              <button
                onClick={() => setLocalLang("en")}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${localLang === "en" ? "border-blue-500 bg-blue-500/10 text-blue-400 font-bold" : "border-white/5 hover:bg-white/5 opacity-60"}`}
              >
                <span className="text-[10px] uppercase tracking-widest font-black">
                  {t.english}
                </span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">
              {t.visualInterface}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  id: "light",
                  name: t.themes.light,
                  icon: <Sun className="w-4 h-4" />,
                },
                {
                  id: "dark",
                  name: t.themes.dark,
                  icon: <Moon className="w-4 h-4" />,
                },
                {
                  id: "oled",
                  name: t.themes.oled,
                  icon: <Monitor className="w-4 h-4" />,
                },
                {
                  id: "cyber",
                  name: t.themes.cyber,
                  icon: <Zap className="w-4 h-4" />,
                },
                {
                  id: "sunset",
                  name: t.themes.sunset,
                  icon: <Heart className="w-4 h-4" />,
                },
              ].map((tInfo) => (
                <button
                  key={tInfo.id}
                  onClick={() => setLocalTheme(tInfo.id as Theme)}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${localTheme === tInfo.id ? "border-blue-500 bg-blue-500/10 text-blue-400 font-black" : "border-white/5 hover:bg-white/5 opacity-60"}`}
                >
                  {tInfo.icon}
                  <span className="text-[10px] uppercase tracking-widest leading-none">
                    {tInfo.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={save}
            className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] mt-4 shadow-2xl shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-95"
          >
            {t.save}
          </button>
        </div>

        <AnimatePresence>
          {is2FASubModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className={`w-full max-w-sm rounded-[2.5rem] p-8 border ${profile?.theme === "light" ? "bg-white border-slate-200" : "bg-[#1e293b] border-white/10 text-white"}`}
              >
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold uppercase tracking-tighter italic mb-2">
                    {profile?.twoFactorEnabled ? t.disable2FA : t.setup2FA}
                  </h3>
                  <p className="text-xs opacity-60">
                    Authorize your account with Google Authenticator
                  </p>
                </div>

                {!profile?.twoFactorEnabled ? (
                  <div className="flex flex-col items-center gap-6">
                    <div className="p-4 bg-white rounded-2xl shadow-2xl">
                      <QRCodeSVG
                        value={generateURI({
                          secret: twoFactorSecret,
                          issuer: "NovaMessenger",
                          label: profile?.email || "user",
                        })}
                        size={160}
                      />
                    </div>
                    <p className="text-[10px] items-center font-mono break-all opacity-60 bg-black/20 p-2 rounded-lg">
                      {twoFactorSecret}
                    </p>

                    <div className="w-full">
                      <input
                        type="text"
                        placeholder="000 000"
                        value={twoFactorToken}
                        onChange={(e) =>
                          setTwoFactorToken(
                            e.target.value.replace(/\D/g, "").slice(0, 6),
                          )
                        }
                        className="w-full p-4 rounded-xl text-center text-2xl font-black tracking-[0.3em] bg-black/20 outline-none focus:ring-2 ring-blue-500"
                      />
                      <button
                        onClick={enable2FA}
                        className="w-full mt-4 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-600/20"
                      >
                        {t.enable2FA}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <ShieldAlert className="w-16 h-16 text-red-500 mb-2" />
                    <p className="text-sm font-bold text-center">
                      Are you sure you want to disable 2FA?
                    </p>
                    <button
                      onClick={disable2FA}
                      className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest"
                    >
                      Confirm Disable
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setIs2FASubModal(false)}
                  className="w-full mt-2 py-3 opacity-50 font-bold uppercase text-xs"
                >
                  Close
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function UserInfoModal({
  user,
  profile,
  onClose,
  addNotification,
  isAdmin,
}: {
  user: UserProfile;
  profile: UserProfile | null;
  onClose: () => void;
  addNotification: any;
  isAdmin: boolean;
}) {
  const isLight = profile?.theme === "light";

  const reportUser = async () => {
    const reason = window.prompt("Укажите причину жалобы:");
    if (!reason) return;
    try {
      await addDoc(collection(db, "reports"), {
        reporterId: profile?.uid,
        targetId: user.uid,
        reason,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      addNotification("Репорт отправлен администраторам", "success");
      onClose();
    } catch (e) {
      addNotification("Ошибка при отправке репорта", "error");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[80] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className={`w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border ${isLight ? "bg-white text-slate-900 border-slate-200" : "bg-[#1e293b] text-white border-white/10"}`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black italic tracking-tighter uppercase">
            Профиль
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${isLight ? "hover:bg-slate-100" : "hover:bg-white/10"}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="relative">
            <img
              src={user.photoURL}
              className="w-24 h-24 rounded-3xl object-cover shadow-2xl border-4 border-blue-500/20"
              alt=""
            />
            <div
              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 ${isOnline(user.lastSeen) ? "bg-green-500" : "bg-slate-500"} ${isLight ? "border-white" : "border-[#1e293b]"}`}
            />
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <h3 className="text-2xl font-black tracking-tighter uppercase italic">
                {user.displayName}
              </h3>
              <VerificationBadge
                id={user.id}
                isPlus={user.isPlus}
                role={user.role}
              />
            </div>
            <p className="text-blue-500 font-bold text-sm tracking-widest uppercase">
              @{user.handle || `user_${user.id}`}
            </p>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <div
            className={`p-4 rounded-2xl ${isLight ? "bg-slate-50" : "bg-white/5"}`}
          >
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">
              Био
            </p>
            <p className="text-sm font-medium">
              {user.bio || "Этот пользователь предпочитает хранить молчание"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div
              className={`p-4 rounded-2xl ${isLight ? "bg-slate-50" : "bg-white/5"}`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">
                Nova ID
              </p>
              <p className="text-lg font-black tracking-widest">#{user.id}</p>
            </div>
            <div
              className={`p-4 rounded-2xl ${isLight ? "bg-slate-50" : "bg-white/5"}`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">
                Статус
              </p>
              <p
                className={`text-sm font-black uppercase tracking-widest ${isOnline(user.lastSeen) ? "text-green-500" : "text-slate-500"}`}
              >
                {isOnline(user.lastSeen) ? "Online" : "Offline"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={reportUser}
            className="w-full py-4 bg-orange-600/10 text-orange-500 hover:bg-orange-600/20 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
          >
            Пожаловаться
          </button>
          {isAdmin && (
            <button
              onClick={() => {
                addNotification(
                  "Используйте админ-панель для действий",
                  "info",
                );
                onClose();
              }}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all"
            >
              Открыть админку
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function GroupInfoModal({
  chat,
  profile,
  onClose,
  addNotification,
  isAdmin,
}: {
  chat: Chat;
  profile: UserProfile | null;
  onClose: () => void;
  addNotification: any;
  isAdmin: boolean;
}) {
  const isLight = profile?.theme === "light";
  const [name, setName] = useState(chat.name || "");
  const [bio, setBio] = useState((chat as any).bio || "");
  const [avatarURL, setAvatarURL] = useState(chat.avatarURL || "");
  const [isEditing, setIsEditing] = useState(false);
  const canEdit = isAdmin || chat.creatorId === profile?.uid;

  const saveChanges = async () => {
    try {
      await updateDoc(doc(db, "chats", chat.id), { name, bio, avatarURL });
      addNotification("Группа обновлена", "success");
      setIsEditing(false);
    } catch (e) {
      addNotification("Ошибка при обновлении", "error");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[80] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className={`w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border ${isLight ? "bg-white text-slate-900 border-slate-200" : "bg-[#1e293b] text-white border-white/10"}`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black italic tracking-tighter uppercase">
            Инфо о группе
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${isLight ? "hover:bg-slate-100" : "hover:bg-white/10"}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 mb-6 relative">
          <img
            src={isEditing ? avatarURL : chat.avatarURL}
            className="w-24 h-24 rounded-3xl object-cover shadow-2xl border-4 border-blue-500/20"
            alt=""
          />
          {isEditing && (
            <input
              value={avatarURL}
              onChange={(e) => setAvatarURL(e.target.value)}
              placeholder="URL аватарки"
              className="w-full text-xs p-2 rounded-lg bg-black/20 outline-none text-center"
            />
          )}
          <div className="text-center w-full px-4">
            {isEditing ? (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Имя группы"
                className={`w-full p-3 rounded-xl text-center font-black uppercase italic tracking-tighter text-xl bg-black/20 outline-none ring-2 ring-blue-500`}
                autoFocus
              />
            ) : (
              <h3 className="text-2xl font-black tracking-tighter uppercase italic truncate">
                {chat.name}
              </h3>
            )}
            <p className="text-slate-500 font-bold text-xs tracking-widest mt-1 uppercase">
              {chat.memberIds.length} участников
            </p>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <div
            className={`p-4 rounded-2xl ${isLight ? "bg-slate-50" : "bg-white/5"}`}
          >
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">
              О группе
            </p>
            {isEditing ? (
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Описание группы"
                className={`w-full p-2 rounded-lg text-sm bg-black/10 outline-none resize-none`}
                rows={3}
              />
            ) : (
              <p className="text-sm font-medium">
                {(chat as any).bio || "Описание отсутствует"}
              </p>
            )}
          </div>
          <div
            className={`p-4 rounded-2xl ${isLight ? "bg-slate-50" : "bg-white/5"}`}
          >
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">
              Создатель
            </p>
            <p className="text-[10px] font-mono opacity-60 truncate">
              {chat.creatorId || "System"}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {canEdit &&
            (isEditing ? (
              <button
                onClick={saveChanges}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20 transition-all"
              >
                Сохранить
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all"
              >
                Редактировать
              </button>
            ))}
          <button
            onClick={onClose}
            className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
          >
            Закрыть
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CreatorPanel({
  profile,
  onClose,
  addNotification,
}: {
  profile: UserProfile | null;
  onClose: () => void;
  addNotification: any;
}) {
  const isLight = profile?.theme === "light";
  const [users, setUsers] = useState<UserProfile[]>([]);

  const promoteUser = async (user: UserProfile) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    try {
      await updateDoc(doc(db, "users", user.uid), { role: newRole });
      addNotification(
        `Роль ${user.displayName} изменена на ${newRole}`,
        "success",
      );
    } catch (e) {
      addNotification("Ошибка при смене роли", "error");
    }
  };

  const deleteAccount = async (user: UserProfile) => {
    if (
      !window.confirm(
        `ВНИМАНИЕ: Вы действительно хотите КОРРЕКТНО удалить аккаунт ${user.displayName}? ID ${user.id} будет возвращен в пул доступных.`,
      )
    )
      return;
    try {
      const configRef = doc(db, "system", "config");
      const configSnap = await getDoc(configRef);
      const availableIds = configSnap.data()?.availableIds || [];

      await updateDoc(configRef, {
        availableIds: [...availableIds, user.id].sort((a, b) => a - b),
      });
      await deleteDoc(doc(db, "users", user.uid));
      addNotification(`Аккаунт удален, ID ${user.id} освобожден`, "success");
    } catch (e) {
      addNotification("Ошибка при удалении", "error");
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const fetchUsers = async () => {
    let q = query(collection(db, "users"), limit(5));
    if (searchQuery) {
      const cleanHandle = searchQuery.startsWith("@")
        ? searchQuery.slice(1).toLowerCase()
        : searchQuery.toLowerCase();
      q = query(collection(db, "users"), where("handle", "==", cleanHandle));
    }
    const snap = await getDocs(q);
    setUsers(snap.docs.map((d) => d.data() as UserProfile));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        className={`w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col rounded-[3rem] shadow-2xl border ${isLight ? "bg-white border-slate-200" : "bg-[#0f172a] border-white/10"}`}
      >
        <div className="p-8 border-b border-white/5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-yellow-500 p-3 rounded-2xl shadow-xl shadow-yellow-500/20">
              <UserCog className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-4xl font-black italic tracking-tighter uppercase">
                Панель Создателя
              </h2>
              <p className="text-yellow-500 text-[10px] font-black uppercase tracking-[0.5em]">
                Supreme Authorized Access
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-white/5 rounded-full"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col items-center">
          {/* Management */}
          <div className="w-full max-w-2xl p-8 overflow-y-auto custom-scrollbar">
            <h3 className="text-xl font-black uppercase italic mb-6 text-blue-500">
              Управление ролями и ID
            </h3>
            <div className="flex gap-2 mb-8">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по handle..."
                className={`flex-1 p-4 rounded-2xl outline-none ring-2 ring-transparent focus:ring-blue-500 transition-all ${isLight ? "bg-slate-50 border" : "bg-white/5 text-white"}`}
              />
              <button
                onClick={fetchUsers}
                className="bg-blue-600 text-white px-6 rounded-2xl font-black uppercase tracking-widest text-xs"
              >
                Найти
              </button>
            </div>

            <div className="space-y-4">
              {users.map((u) => (
                <div
                  key={u.uid}
                  className={`p-4 rounded-3xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"} flex items-center justify-between`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={u.photoURL}
                      className="w-12 h-12 rounded-xl"
                      alt=""
                    />
                    <div>
                      <p className="font-bold">{u.displayName}</p>
                      <p className="text-[10px] opacity-40 uppercase tracking-widest">
                        ID: {u.id} | {u.role || "user"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => promoteUser(u)}
                      className={`p-2 rounded-xl text-[10px] font-black uppercase transition-all ${u.role === "admin" ? "bg-orange-500 text-white" : "bg-blue-500/20 text-blue-500"}`}
                    >
                      {u.role === "admin" ? "Revoke Admin" : "Make Admin"}
                    </button>
                    <button
                      onClick={() => deleteAccount(u)}
                      className="p-2 bg-red-600/20 text-red-500 rounded-xl text-xs"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DevToolsModal({
  profile,
  onClose,
  addNotification,
  systemConfig,
}: {
  profile: UserProfile | null;
  onClose: () => void;
  addNotification: any;
  systemConfig: any;
}) {
  const isLight = profile?.theme === "light";
  const isLocked = systemConfig?.globalChatLock || false;

  const blockAllIPs = async () => {
    try {
      await setDoc(
        doc(db, "system", "config"),
        { globalChatLock: !isLocked },
        { merge: true },
      );
      addNotification(
        !isLocked ? "ВСЕ ЧАТЫ ЗАБЛОКИРОВАНЫ" : "БЛОКИРОВКА СНЯТА",
        !isLocked ? "error" : "success",
      );
    } catch (e) {
      addNotification("Ошибка базы данных", "error");
    }
  };

  const loadDatabaseBackup = async () => {
    try {
      addNotification("ВЫГРУЗКА БАЗЫ ДАННЫХ...", "info");
      // Fetch all users and chats to represent a backup
      const usersSnap = await getDocs(collection(db, "users"));
      const chatsSnap = await getDocs(collection(db, "chats"));

      const backup = {
        users: usersSnap.docs.map((d) => d.data()),
        chats: chatsSnap.docs.map((d) => d.data()),
        timestamp: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nova_db_backup_${new Date().getTime()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      addNotification("ВЫГРУЗКА БАЗЫ ЗАВЕРШЕНА", "success");
    } catch (e) {
      addNotification("ОШИБКА", "error");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className={`w-full max-w-2xl rounded-[3rem] p-10 border shadow-2xl relative overflow-hidden ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0a] border-[#00ff41]/20 text-[#00ff41] font-mono"}`}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-[#00ff41] shadow-[0_0_15px_#00ff41] animate-pulse" />

        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <Server className="w-10 h-10 animate-pulse" />
            <div>
              <h2 className="text-3xl font-black italic tracking-tighter uppercase">
                Root Dev Menu
              </h2>
              <p className="text-[10px] font-bold opacity-50">
                SYSTEM VERSION: 2.1.0-REWORK
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-white/10 rounded-full"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl border border-[#00ff41]/20 bg-emerald-500/5 col-span-2">
            <h3 className="text-sm font-black mb-4 uppercase tracking-widest text-[#00ff41]">
              Core Controls
            </h3>
            <div className="flex gap-4">
              <button
                onClick={blockAllIPs}
                className={`flex-1 py-6 border rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all ${isLocked ? "bg-red-600 border-red-500 text-white shadow-[0_0_20px_red]" : "bg-[#00ff41]/10 hover:bg-[#00ff41]/20 border-[#00ff41]/50 text-[#00ff41]"}`}
              >
                {isLocked ? "Разблокировать чаты" : "Блокировать все чаты"}
              </button>
              <button
                onClick={loadDatabaseBackup}
                className="flex-1 py-6 bg-[#00ff41]/10 hover:bg-[#00ff41]/20 border border-[#00ff41]/50 text-[#00ff41] rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all"
              >
                Выгрузить БД
              </button>
            </div>
          </div>

          <div className="p-6 rounded-3xl border border-[#00ff41]/10 bg-white/5">
            <h3 className="text-[10px] font-black mb-3 uppercase tracking-widest opacity-50">
              Network Status
            </h3>
            <ul className="space-y-2 text-[11px]">
              <li className="flex justify-between">
                <span>Firewall:</span>{" "}
                <span className="text-[#00ff41]">ACTIVE</span>
              </li>
              <li className="flex justify-between">
                <span>Latency:</span>{" "}
                <span className="text-[#00ff41]">18ms</span>
              </li>
              <li className="flex justify-between">
                <span>Load:</span> <span className="text-[#00ff41]">4%</span>
              </li>
            </ul>
          </div>

          <div className="p-6 rounded-3xl border border-[#00ff41]/10 bg-white/5">
            <h3 className="text-[10px] font-black mb-3 uppercase tracking-widest opacity-50">
              Database Shards
            </h3>
            <ul className="space-y-2 text-[11px]">
              <li className="flex justify-between">
                <span>Users:</span>{" "}
                <span className="text-[#00ff41]">Healthy</span>
              </li>
              <li className="flex justify-between">
                <span>Messages:</span>{" "}
                <span className="text-[#00ff41]">Synced</span>
              </li>
              <li className="flex justify-between">
                <span>Media:</span>{" "}
                <span className="text-[#00ff41]">Ready</span>
              </li>
            </ul>
          </div>

          <div className="p-6 rounded-3xl border border-[#00ff41]/20 bg-red-600/10 col-span-2">
            <div className="flex items-center gap-3 text-red-500 mb-2 font-black uppercase tracking-widest text-xs">
              <AlertCircle className="w-5 h-5 shadow-[0_0_10px_red]" /> Danger
              Zone
            </div>
            <p className="text-[10px] opacity-70 mb-4 font-bold">
              Execution of these commands will permanently alter global state.
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => addNotification("ALL CHATS FROZEN", "error")}
                className="py-3 bg-red-900/40 hover:bg-red-900 border border-red-900 rounded-xl text-[9px] font-black uppercase"
              >
                Freeze Chats
              </button>
              <button
                onClick={() =>
                  addNotification("SESSION RESET INITIATED", "error")
                }
                className="py-3 bg-red-900/40 hover:bg-red-900 border border-red-900 rounded-xl text-[9px] font-black uppercase"
              >
                Reset Tokens
              </button>
              <button
                onClick={() => addNotification("WIPE ABORTED", "info")}
                className="py-3 bg-red-900 hover:bg-red-700 border border-red-500 rounded-xl text-[9px] font-black uppercase"
              >
                Wipe Cache
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function NovaStoreModal({
  profile,
  onClose,
  addNotification,
}: {
  profile: UserProfile | null;
  onClose: () => void;
  addNotification: any;
}) {
  const isLight = profile?.theme === "light";

  const buyPlus = async (months: number) => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        isPlus: true,
        plusExpires: serverTimestamp(), // Simplified
      });
      addNotification(
        `Nova Plus активирован на ${months} мес. (Тестовый режим)`,
        "success",
      );
      onClose();
    } catch (e) {
      addNotification("Ошибка покупки", "error");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-2xl flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: 50, scale: 0.9 }}
        animate={{ y: 0, scale: 1 }}
        className={`w-full max-w-lg rounded-[3rem] p-10 border shadow-2xl relative overflow-hidden ${isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[#0f172a] border-yellow-500/20 text-white"}`}
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500" />

        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-4xl font-black italic tracking-tighter uppercase flex items-center gap-3">
              Nova Plus{" "}
              <Sparkles className="w-8 h-8 text-yellow-500 animate-bounce" />
            </h2>
            <p className="text-yellow-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1">
              Upgrade your experience
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-white/10 rounded-full"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        <div className="space-y-6 mb-10">
          {[
            {
              icon: <Check className="text-green-500" />,
              title: "Эксклюзивный значок",
              desc: "Золотая искра рядом с вашим именем",
            },
            {
              icon: <Check className="text-green-500" />,
              title: "Анимированные аватары",
              desc: "Выделяйтесь в списке контактов",
            },
            {
              icon: <Check className="text-green-500" />,
              title: "Лимит групп: 100",
              desc: "Вместо стандартных 10 групп",
            },
            {
              icon: <Check className="text-green-500" />,
              title: "Размер файлов: 2ГБ",
              desc: "Забудьте о лимитах на медиа",
            },
          ].map((f, i) => (
            <div
              key={i}
              className={`flex items-start gap-4 p-4 rounded-3xl ${isLight ? "bg-slate-50" : "bg-white/5"}`}
            >
              <div className="mt-1">{f.icon}</div>
              <div>
                <p className="font-black uppercase italic tracking-tight text-sm">
                  {f.title}
                </p>
                <p className="text-xs opacity-50 font-bold">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => buyPlus(1)}
            className="p-6 rounded-[2rem] border-2 border-yellow-500/20 hover:border-yellow-500 transition-all text-center group"
          >
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">
              1 Месяц
            </p>
            <p className="text-2xl font-black italic">$4.99</p>
          </button>
          <button
            onClick={() => buyPlus(12)}
            className="p-6 rounded-[2rem] bg-yellow-500 text-black hover:bg-yellow-400 transition-all text-center relative group"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-[8px] font-black uppercase py-1 px-3 rounded-full shadow-lg">
              -40%
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">
              12 Месяцев
            </p>
            <p className="text-2xl font-black italic">$35.99</p>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AdminPanel({
  profile,
  onClose,
  chats,
  addNotification,
}: {
  profile: UserProfile | null;
  onClose: () => void;
  chats: Chat[];
  addNotification: (t: string, type: any) => void;
}) {
  const lang: Language = profile?.language || "ru";
  const t = translations[lang];

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [targetId, setTargetId] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banDays, setBanDays] = useState("7");

  useEffect(() => {
    const fetchUsers = async () => {
      const q = query(collection(db, "users"), limit(50));
      const snap = await getDocs(q);
      setUsers(snap.docs.map((d) => d.data() as UserProfile));
    };
    fetchUsers();
  }, []);

  const searchUser = async () => {
    if (!targetId) return;
    try {
      let q;
      if (!isNaN(Number(targetId))) {
        q = query(collection(db, "users"), where("id", "==", Number(targetId)));
      } else if (targetId.startsWith("@")) {
        q = query(
          collection(db, "users"),
          where("handle", "==", targetId.slice(1).toLowerCase()),
        );
      } else {
        // Try handle first without @
        const q2 = query(
          collection(db, "users"),
          where("handle", "==", targetId.toLowerCase()),
        );
        const snap2 = await getDocs(q2);
        if (!snap2.empty) {
          setSelectedUser(snap2.docs[0].data() as UserProfile);
          return;
        }
        // Fallback to displayName exact match
        q = query(
          collection(db, "users"),
          where("displayName", "==", targetId),
        );
      }

      const snap = await getDocs(q);
      if (!snap.empty) {
        setSelectedUser(snap.docs[0].data() as UserProfile);
      } else {
        addNotification(t.noUsersFound, "error");
      }
    } catch (err) {
      addNotification("Search error", "error");
    }
  };

  const moderate = async (type: "ban" | "mute" | "unban" | "unmute") => {
    if (!selectedUser) return;
    if (selectedUser.role === "creator" || selectedUser.id === 1)
      return addNotification("Нельзя наказывать создателя!", "error");

    try {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + (parseInt(banDays) || 1));

      let updates: any = {};

      if (type === "ban") {
        updates = { isBanned: true, banReason, banExpires: expiry };
      } else if (type === "mute") {
        updates = { isMuted: true, muteReason: banReason, muteExpires: expiry };
      } else if (type === "unban") {
        updates = { isBanned: false, banReason: null, banExpires: null };
      } else if (type === "unmute") {
        updates = { isMuted: false, muteReason: null, muteExpires: null };
      }

      await updateDoc(doc(db, "users", selectedUser.uid), updates);

      const actionsMap = {
        ban: "Бан выдан",
        mute: "Мут выдан",
        unban: "Разбан выдан",
        unmute: "Размут выдан",
      };
      addNotification(
        `${actionsMap[type as keyof typeof actionsMap]}: ${selectedUser.displayName}`,
        "success",
      );

      // Also send report to creator automatically if it's a ban
      if ((type === "ban" || type === "mute") && profile?.uid) {
        await addDoc(collection(db, "reports"), {
          reporterId: profile.uid,
          targetId: selectedUser.uid,
          reason: `ADMIN ACTION (${type.toUpperCase()}): ${banReason}`,
          status: "pending",
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      addNotification("Ошибка при выполнении действия", "error");
    }
  };

  const [reports, setReports] = useState<UserReport[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "reports"), orderBy("createdAt", "desc")),
      (snap) => {
        setReports(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserReport),
        );
      },
    );
    return () => unsub();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        className={`w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col rounded-[3rem] shadow-2xl border ${profile?.theme === "light" ? "bg-white border-slate-200" : "bg-[#0f172a] border-white/10"}`}
      >
        <div className="p-8 border-b border-white/5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-orange-500 p-3 rounded-2xl shadow-xl shadow-orange-500/20">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-4xl font-black italic tracking-tighter uppercase">
                {t.adminTitle || "Админ Панель"}
              </h2>
              <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.5em]">
                Moderation Access
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-white/5 rounded-full"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden grid grid-cols-2">
          {/* Left: Moderation */}
          <div className="p-8 border-r border-white/5 overflow-y-auto custom-scrollbar space-y-6">
            <div
              className={`p-6 rounded-3xl border ${profile?.theme === "light" ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/5"}`}
            >
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <UserMinus className="w-5 h-5 text-red-500" /> {t.moderation}
              </h3>
              <div className="flex gap-2 mb-4">
                <input
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  placeholder="ID / Nickname"
                  className={`flex-1 rounded-xl px-4 text-sm outline-none focus:ring-1 ring-blue-500 ${profile?.theme === "light" ? "bg-white border border-slate-200 text-black" : "bg-black/20 border border-white/10 text-white"}`}
                />
                <button
                  onClick={searchUser}
                  className="bg-blue-600 text-white px-8 py-2 rounded-xl text-sm font-black uppercase tracking-widest"
                >
                  {t.find}
                </button>
              </div>
              {selectedUser && (
                <div
                  className={`p-6 rounded-3xl mb-4 border ${profile?.theme === "light" ? "bg-gradient-to-br from-blue-100 to-purple-100 border-blue-200" : "bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-white/10"}`}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <img
                      src={selectedUser.photoURL}
                      className={`w-16 h-16 rounded-2xl shadow-xl border ${profile?.theme === "light" ? "border-white" : "border-white/10"}`}
                      alt=""
                    />
                    <div>
                      <p className="font-black text-xl italic tracking-tighter">
                        {selectedUser.displayName}
                      </p>
                      <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">
                        User ID: {selectedUser.id}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <input
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      placeholder="Причина (для бана/мута)"
                      className={`w-full rounded-2xl px-4 py-3 text-sm focus:ring-1 ring-blue-500 outline-none ${profile?.theme === "light" ? "bg-white border border-slate-200 text-black" : "bg-black/30 border border-white/5 text-white"}`}
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={banDays}
                        onChange={(e) => setBanDays(e.target.value)}
                        placeholder="Дни"
                        className={`w-20 rounded-2xl px-4 py-3 text-sm outline-none ${profile?.theme === "light" ? "bg-white border border-slate-200 text-black" : "bg-black/30 border border-white/5 text-white"}`}
                      />
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => moderate("ban")}
                          className="bg-red-600 text-white hover:bg-red-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Ban
                        </button>
                        <button
                          onClick={() => moderate("mute")}
                          className="bg-orange-600 text-white hover:bg-orange-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Mute
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <button
                        onClick={() => moderate("unban")}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
                      >
                        Unban
                      </button>
                      <button
                        onClick={() => moderate("unmute")}
                        className="bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20"
                      >
                        Unmute
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              className={`p-6 rounded-3xl border ${profile?.theme === "light" ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/5"}`}
            >
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-500 underline decoration-blue-500/20">
                System Logs
              </h3>
              <div className="space-y-2 opacity-50">
                {[
                  { msg: "User #42 logged in", time: "12:44" },
                  { msg: "Group 'Developers' created", time: "12:35" },
                  { msg: "Global Broadcast sent by Admin", time: "12:10" },
                ].map((log, i) => (
                  <div
                    key={i}
                    className={`flex justify-between items-center text-[11px] p-2 rounded-lg font-mono ${profile?.theme === "light" ? "bg-slate-200" : "bg-black/20"}`}
                  >
                    <span className="text-green-500 font-bold mr-2">
                      {log.time}
                    </span>
                    <span className="flex-1 truncate tracking-tight">
                      {log.msg}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className={`p-6 rounded-3xl border ${profile?.theme === "light" ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/5"}`}
            >
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                Список пользователей
              </h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                {users.map((u, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedUser(u)}
                    className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors ${profile?.theme === "light" ? "hover:bg-slate-200" : "hover:bg-white/5"}`}
                  >
                    <img
                      src={u.photoURL}
                      className="w-8 h-8 rounded-lg"
                      alt=""
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <p className="text-sm font-bold truncate">
                          {u.displayName}
                        </p>
                        <VerificationBadge
                          id={u.id}
                          isPlus={u.isPlus}
                          role={u.role}
                        />
                      </div>
                      <p className="text-[10px] opacity-40">ID: {u.id}</p>
                    </div>
                    {u.isBanned && (
                      <span className="text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full font-bold">
                        BANNED
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Reports */}
          <div className="p-8 flex flex-col overflow-hidden">
            <h3 className="text-xl font-black uppercase italic mb-6 text-orange-500 flex items-center gap-3">
              Жалобы от админов / Игроков
              <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full text-[10px]">
                {reports.length}
              </span>
            </h3>
            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
              {reports.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20">
                  <ShieldCheck className="w-16 h-16 mb-4" />
                  <p className="text-sm font-black uppercase tracking-widest">
                    Чисто
                  </p>
                </div>
              ) : (
                reports.map((r) => (
                  <div
                    key={r.id}
                    className={`p-5 rounded-[2rem] border border-orange-500/20 ${profile?.theme === "light" ? "bg-orange-50" : "bg-orange-500/5"}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] font-black tracking-widest uppercase opacity-50">
                        Report ID: {r.id}
                      </p>
                      <span className="bg-orange-500 text-[10px] font-black px-2 py-0.5 rounded text-white italic">
                        {r.status}
                      </span>
                    </div>
                    <p className="text-sm font-bold mb-4">
                      Причина: {r.reason}
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest opacity-40">
                      <span>Reporter ID: {r.reporterId?.slice(0, 8)}...</span>
                      <span>Target ID: {r.targetId?.slice(0, 8)}...</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <button
                        onClick={() =>
                          addNotification("Действие в процессе...", "info")
                        }
                        className="py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black"
                      >
                        Решить
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await deleteDoc(doc(db, "reports", r.id));
                            addNotification("Удалено", "success");
                          } catch (e) {
                            console.error(e);
                            addNotification(
                              "Ошибка удаления (недостаточно прав)",
                              "error",
                            );
                          }
                        }}
                        className="py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function GroupCreateModal({
  onCreate,
  onClose,
  profile,
}: {
  onCreate: (name: string) => void;
  onClose: () => void;
  profile: UserProfile | null;
}) {
  const lang: Language = profile?.language || "ru";
  const t = translations[lang];
  const [name, setName] = useState("");
  const isLight = profile?.theme === "light";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className={`w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border ${isLight ? "bg-white text-slate-900 border-slate-200" : "bg-[#1e293b] text-white border-white/10"}`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black italic tracking-tighter uppercase">
            {t.createGroup}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${isLight ? "hover:bg-slate-100" : "hover:bg-white/10"}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.groupName}
          className={`w-full p-4 rounded-2xl mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold placeholder:opacity-50 ${isLight ? "bg-slate-50 border-slate-200 text-slate-900 border" : "bg-white/5 border border-white/10 text-white"}`}
        />
        <button
          onClick={() => onCreate(name)}
          disabled={!name.trim()}
          className="w-full py-4 bg-blue-600 disabled:opacity-50 disabled:hover:scale-100 hover:bg-blue-500 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-95"
        >
          {t.create}
        </button>
      </motion.div>
    </motion.div>
  );
}
