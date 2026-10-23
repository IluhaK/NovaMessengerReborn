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
  Pin,
  Reply,
  Share2,
  Mic,
  MicOff,
  Play,
  Pause,
  Download,
  SmilePlus,
  CornerUpLeft,
  BellOff,
  Volume2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { generateSecret, verifySync, generateURI } from "otplib";
import { Buffer } from "buffer";
import { ThreeHoloOrb } from "./ThreeHoloOrb";

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
import { Chat, Message, UserProfile, Theme, UserReport, ModerationLogEntry } from "../types";
import SpoonParkourGame from "./SpoonParkourGame";
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

const quickReactions = ["👍", "❤️", "🔥", "😂", "😮", "😢", "👏", "🎉", "🚀", "⚡"];

const stickerPack = [
  { emoji: "🚀", label: "To The Moon" },
  { emoji: "💎", label: "Telegram Star" },
  { emoji: "🐸", label: "Pepe Cool" },
  { emoji: "🔥", label: "Pure Fire" },
  { emoji: "👑", label: "Supreme Crown" },
  { emoji: "👾", label: "Cyber Alien" },
  { emoji: "🐶", label: "Good Doge" },
  { emoji: "⚡", label: "Electric Flash" },
  { emoji: "🍕", label: "Pizza Slice" },
  { emoji: "🪐", label: "Cosmic Realm" },
  { emoji: "🎉", label: "Party Time" },
  { emoji: "😎", label: "Super Chad" },
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

const formatLastSeen = (lastSeen: any, _t?: any) => {
  if (!lastSeen) return "был(-а) в сети очень давно";
  try {
    const date = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 120000) return "в сети прямо сейчас";

    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const isToday =
      now.getFullYear() === date.getFullYear() &&
      now.getMonth() === date.getMonth() &&
      now.getDate() === date.getDate();

    if (isToday) {
      return `был(-а) в сети сегодня в ${timeStr}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      yesterday.getFullYear() === date.getFullYear() &&
      yesterday.getMonth() === date.getMonth() &&
      yesterday.getDate() === date.getDate();

    if (isYesterday) {
      return `был(-а) в сети вчера в ${timeStr}`;
    }

    const dayBefore = new Date(now);
    dayBefore.setDate(now.getDate() - 2);
    const isDayBefore =
      dayBefore.getFullYear() === date.getFullYear() &&
      dayBefore.getMonth() === date.getMonth() &&
      dayBefore.getDate() === date.getDate();

    if (isDayBefore) {
      return `был(-а) в сети позавчера в ${timeStr}`;
    }

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      const dayWord = diffDays === 1 ? "день" : diffDays >= 2 && diffDays <= 4 ? "дня" : "дней";
      return `был(-а) в сети ${diffDays} ${dayWord} назад`;
    }

    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 4) {
      const weekWord = diffWeeks === 1 ? "неделю" : diffWeeks >= 2 && diffWeeks <= 4 ? "недели" : "недель";
      return `был(-а) в сети ${diffWeeks} ${weekWord} назад`;
    }

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
      const monthWord = diffMonths === 1 ? "месяц" : diffMonths >= 2 && diffMonths <= 4 ? "месяца" : "месяцев";
      return `был(-а) в сети ${diffMonths} ${monthWord} назад`;
    }

    const diffYears = Math.floor(diffDays / 365);
    if (diffYears < 2) {
      return "был(-а) в сети год назад";
    }

    return "был(-а) в сети очень давно";
  } catch (e) {
    return "был(-а) в сети очень давно";
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

  // New Telegram features state
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceRecordSeconds, setVoiceRecordSeconds] = useState(0);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [emojiTab, setEmojiTab] = useState<"emojis" | "stickers">("emojis");
  const [showChatOptionsMenu, setShowChatOptionsMenu] = useState(false);
  const [showSpoonGame, setShowSpoonGame] = useState(false);
  const [catClicks, setCatClicks] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const [liveWaveform, setLiveWaveform] = useState<number[]>([15, 25, 40, 20, 30, 50, 20, 35, 25, 15]);
  const animFrameRef = useRef<number>(0);
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    size: number;
    type: string;
    dataUrl?: string;
  } | null>(null);
  const voiceTimerRef = useRef<any>(null);

  const playMeowSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(750, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.35);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  };

  const playAudioTone = (type: "send" | "receive" | "voice", durationSec = 3) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      if (type === "voice") {
        const freqs = [330, 392, 440, 523, 440, 392, 349, 392];
        const step = Math.min(Math.max(durationSec, 1.5), 5) / freqs.length;
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + idx * step);
          gain.gain.setValueAtTime(0.06, now + idx * step);
          gain.gain.exponentialRampToValueAtTime(0.001, now + (idx + 1) * step);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * step);
          osc.stop(now + (idx + 1) * step);
        });
      } else if (type === "send") {
        if (profile?.soundEnabled === false) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.14);
      }
    } catch {}
  };

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
    const theme = profile?.theme || "oled";
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
          msgMe: "bg-blue-600 text-white shadow-blue-900/30",
          msgThem: "bg-[#121212] border-white/10 text-white",
          accent: "blue",
          input: "bg-white/5 placeholder:text-white/30 text-white",
          header: "bg-black/90 border-white/10",
        };
      case "emerald":
        return {
          bg: "bg-[#04140e] text-emerald-50",
          text: "text-emerald-50",
          card: "bg-[#082319]",
          sidebar: "bg-[#04140e] border-emerald-500/20",
          msgMe: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-950/40",
          msgThem: "bg-[#082319] border-emerald-500/15 text-emerald-100",
          accent: "green",
          input: "bg-emerald-950/40 border border-emerald-500/20 placeholder:text-emerald-300/30 text-emerald-50",
          header: "bg-[#04140e]/90 border-emerald-500/20",
        };
      case "cyber":
        return {
          bg: "bg-[#040810]",
          text: "text-cyan-50",
          card: "bg-[#091322]",
          sidebar: "bg-[#040810] border-cyan-500/20",
          msgMe: "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]",
          msgThem: "bg-[#091322] border-cyan-500/15 text-cyan-100",
          accent: "cyan",
          input: "bg-cyan-950/30 border border-cyan-500/20 placeholder:text-cyan-400/30 text-cyan-50",
          header: "bg-[#040810]/90 border-cyan-500/20",
        };
      case "sunset":
        return {
          bg: "bg-[#140818] text-rose-100",
          text: "text-rose-50",
          card: "bg-[#230f2a]",
          sidebar: "bg-[#140818] border-rose-500/20",
          msgMe: "bg-gradient-to-r from-rose-600 to-orange-500 text-white shadow-rose-950/40",
          msgThem: "bg-[#230f2a] border-rose-500/15 text-rose-100",
          accent: "orange",
          input: "bg-rose-950/30 border border-rose-500/20 placeholder:text-rose-300/30 text-rose-50",
          header: "bg-[#140818]/90 border-rose-500/20",
        };
      case "nordic":
        return {
          bg: "bg-[#09111e] text-slate-100",
          text: "text-slate-50",
          card: "bg-[#101c30]",
          sidebar: "bg-[#09111e] border-sky-500/20",
          msgMe: "bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-sky-950/40",
          msgThem: "bg-[#101c30] border-sky-500/15 text-slate-100",
          accent: "sky",
          input: "bg-sky-950/30 border border-sky-500/20 placeholder:text-sky-300/30 text-slate-50",
          header: "bg-[#09111e]/90 border-sky-500/20",
        };
      case "telegram":
        return {
          bg: "bg-[#0e1621] text-white",
          text: "text-white",
          card: "bg-[#17212b]",
          sidebar: "bg-[#0e1621] border-[#1f2c38]",
          msgMe: "bg-[#2b5278] text-white shadow-black/20",
          msgThem: "bg-[#182533] border-[#223345] text-white",
          accent: "blue",
          input: "bg-[#17212b] placeholder:text-slate-400 text-white border border-[#223345]",
          header: "bg-[#17212b]/95 border-[#1f2c38]",
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

  const getFontSizeClass = () => {
    switch (profile?.fontSize) {
      case "small":
        return "text-[13px] leading-relaxed";
      case "large":
        return "text-[17px] leading-relaxed";
      default:
        return "text-[15px] leading-relaxed";
    }
  };

  const getBubbleRadiusClass = (isMe: boolean) => {
    switch (profile?.bubbleStyle) {
      case "rounded":
        return isMe ? "rounded-[32px] rounded-br-sm" : "rounded-[32px] rounded-bl-sm";
      case "sharp":
        return isMe ? "rounded-xl rounded-br-xs" : "rounded-xl rounded-bl-xs";
      default:
        return isMe ? "rounded-[24px] rounded-br-none" : "rounded-[24px] rounded-bl-none";
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
      label: "Избранное",
      icon: <Bookmark className="w-5 h-5 text-yellow-500" />,
      onClick: () => openSavedMessages(),
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

  // Open or create Saved Messages chat (Избранное)
  const openSavedMessages = async () => {
    if (!profile) return;
    try {
      const savedChatId = `saved_${profile.uid}`;
      const savedDoc = await getDoc(doc(db, "chats", savedChatId));
      if (!savedDoc.exists()) {
        const newSavedChat = {
          id: savedChatId,
          type: "saved" as const,
          name: "Избранное (Saved Messages)",
          avatarURL: "https://api.dicebear.com/7.x/identicon/svg?seed=saved_" + profile.uid,
          creatorId: profile.uid,
          memberIds: [profile.uid],
          createdAt: serverTimestamp(),
          lastMessage: "Личные заметки и сохраненные сообщения",
          lastMessageAt: serverTimestamp(),
        };
        await setDoc(doc(db, "chats", savedChatId), newSavedChat);
        setActiveChat(newSavedChat as any);
      } else {
        setActiveChat({ id: savedDoc.id, ...savedDoc.data() } as Chat);
      }
      setShowSidebarMenu(false);
      addNotification("Переход в Избранное", "info");
    } catch (e) {
      console.error(e);
      addNotification("Ошибка открытия Избранного", "error");
    }
  };

  // Toggle Reaction on message
  const toggleReaction = async (msg: Message, emoji: string) => {
    if (!activeChat || !profile?.uid) return;
    try {
      const currentReactions: Record<string, string[]> = { ...(msg.reactions || {}) };
      const currentList: string[] = currentReactions[emoji] ? [...currentReactions[emoji]] : [];
      const userIndex = currentList.indexOf(profile.uid);

      if (userIndex > -1) {
        currentList.splice(userIndex, 1);
      } else {
        currentList.push(profile.uid);
      }

      if (currentList.length === 0) {
        delete currentReactions[emoji];
      } else {
        currentReactions[emoji] = currentList;
      }

      await updateDoc(
        doc(db, `chats/${activeChat.id}/messages`, msg.id),
        { reactions: currentReactions }
      );
      setActiveReactionMsgId(null);
    } catch (err) {
      console.error("Error updating reactions", err);
      addNotification("Не удалось поставить реакцию", "error");
    }
  };

  // Toggle Pin message
  const togglePinMessage = async (msg: Message) => {
    if (!activeChat || !profile?.uid) return;
    try {
      const isPinned = !msg.pinned;
      await updateDoc(doc(db, `chats/${activeChat.id}/messages`, msg.id), {
        pinned: isPinned,
        pinnedAt: isPinned ? serverTimestamp() : null,
      });

      if (isPinned) {
        await updateDoc(doc(db, "chats", activeChat.id), {
          pinnedMessageId: msg.id,
          pinnedMessage: {
            id: msg.id,
            text: msg.text,
            senderName: msg.senderName,
          },
        });
        addNotification("Сообщение закреплено", "success");
      } else if (activeChat.pinnedMessageId === msg.id) {
        await updateDoc(doc(db, "chats", activeChat.id), {
          pinnedMessageId: null,
          pinnedMessage: null,
        });
        addNotification("Сообщение откреплено", "info");
      }
    } catch (err) {
      console.error("Failed to pin message", err);
      addNotification("Ошибка при закреплении сообщения", "error");
    }
  };

  // Toggle Mute chat
  const toggleMuteChat = async (chatId: string) => {
    if (!profile) return;
    try {
      const targetChat = chats.find((c) => c.id === chatId) || activeChat;
      if (!targetChat) return;
      const currentMuted = targetChat.mutedBy || [];
      const isMuted = currentMuted.includes(profile.uid);
      const newMuted = isMuted
        ? currentMuted.filter((id) => id !== profile.uid)
        : [...currentMuted, profile.uid];

      await updateDoc(doc(db, "chats", chatId), {
        mutedBy: newMuted,
      });

      addNotification(isMuted ? "Уведомления включены" : "Чат заглушен", "info");
    } catch (err) {
      console.error(err);
      addNotification("Ошибка изменения настроек чата", "error");
    }
  };

  // Export chat transcript to file
  const exportChatHistory = () => {
    if (!activeChat || messages.length === 0) {
      addNotification("Нет сообщений для экспорта", "info");
      return;
    }
    const lines = [
      `--- Nova Messenger Chat Transcript ---`,
      `Chat: ${activeChat.name || "Direct Chat"}`,
      `Date: ${new Date().toLocaleString()}`,
      `Total messages: ${messages.length}`,
      `--------------------------------------\n`,
    ];
    messages.forEach((m) => {
      const time = m.createdAt?.toDate ? format(m.createdAt.toDate(), "yyyy-MM-dd HH:mm:ss") : "Unknown time";
      lines.push(`[${time}] ${m.senderName}: ${m.text}`);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat_export_${(activeChat.name || "chat").replace(/[^a-zA-Z0-9_-]/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setShowChatOptionsMenu(false);
    addNotification("История чата экспортирована в файл", "success");
  };

  // Real voice recording via microphone (MediaRecorder + Web Audio API Analyser)
  const startVoiceRecording = async () => {
    if (isRecordingVoice) return;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        addNotification("Ваш браузер не поддерживает запись с микрофона", "error");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        audioAnalyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateWave = () => {
          analyser.getByteFrequencyData(dataArray);
          const samples: number[] = [];
          const step = Math.max(1, Math.floor(dataArray.length / 10));
          for (let i = 0; i < 10; i++) {
            const val = dataArray[i * step] || 10;
            samples.push(Math.max(12, Math.min(100, Math.round((val / 255) * 100))));
          }
          setLiveWaveform(samples);
          animFrameRef.current = requestAnimationFrame(updateWave);
        };
        animFrameRef.current = requestAnimationFrame(updateWave);
      }

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 32000 });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100);
      setIsRecordingVoice(true);
      setVoiceRecordSeconds(0);

      voiceTimerRef.current = setInterval(() => {
        setVoiceRecordSeconds((prev) => {
          if (prev >= 59) {
            finishVoiceRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      addNotification("Разрешите доступ к микрофону в браузере для отправки голосовых", "error");
    }
  };

  const cancelVoiceRecording = () => {
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    setIsRecordingVoice(false);
    setVoiceRecordSeconds(0);
  };

  const finishVoiceRecording = async () => {
    if (!activeChat || !profile) {
      cancelVoiceRecording();
      return;
    }
    const duration = Math.max(1, voiceRecordSeconds);
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      cancelVoiceRecording();
      return;
    }

    recorder.onstop = async () => {
      try {
        const mime = recorder.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((track) => track.stop());
          audioStreamRef.current = null;
        }
        setIsRecordingVoice(false);
        setVoiceRecordSeconds(0);

        const reader = new FileReader();
        reader.onloadend = async () => {
          const dataUrl = reader.result as string;
          const msgData: Record<string, any> = {
            chatId: activeChat.id,
            senderId: profile.uid,
            senderName: profile.displayName,
            senderNumericId: profile.id || 0,
            isPlus: profile.isPlus || false,
            senderRole: profile.role || "user",
            text: `🎤 Голосовое сообщение (${duration} сек)`,
            createdAt: serverTimestamp(),
            type: "voice" as const,
            voiceDuration: duration,
            voiceWaveform: liveWaveform,
            attachment: {
              name: `voice_${Date.now()}.webm`,
              size: audioBlob.size,
              type: mime,
              dataUrl,
            },
          };
          await addDoc(collection(db, `chats/${activeChat.id}/messages`), msgData);
          await updateDoc(doc(db, "chats", activeChat.id), {
            lastMessage: `🎤 Голосовое сообщение (${duration}с)`,
            lastMessageAt: serverTimestamp(),
          });
          playAudioTone("send");
          addNotification("Голосовое сообщение отправлено", "success");
        };
        reader.readAsDataURL(audioBlob);
      } catch (e) {
        console.error(e);
        addNotification("Ошибка сохранения аудиозаписи", "error");
      }
    };

    recorder.stop();
  };

  const playVoiceMessage = (msgId: string, durationSec = 3, dataUrl?: string) => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (playingVoiceId === msgId) {
      setPlayingVoiceId(null);
      return;
    }
    setPlayingVoiceId(msgId);
    if (dataUrl) {
      const audio = new Audio(dataUrl);
      activeAudioRef.current = audio;
      audio.onended = () => {
        setPlayingVoiceId(null);
        activeAudioRef.current = null;
      };
      audio.onerror = () => {
        setPlayingVoiceId(null);
        activeAudioRef.current = null;
        playAudioTone("voice", durationSec);
      };
      audio.play().catch(() => {
        playAudioTone("voice", durationSec);
      });
    } else {
      playAudioTone("voice", durationSec);
      setTimeout(() => {
        setPlayingVoiceId((curr) => (curr === msgId ? null : curr));
      }, Math.max(durationSec * 1000, 2500));
    }
  };

  // Send sticker
  const sendSticker = async (stickerEmoji: string, label: string) => {
    if (!activeChat || !profile) return;
    try {
      const msgData = {
        chatId: activeChat.id,
        senderId: profile.uid,
        senderName: profile.displayName,
        senderNumericId: profile.id || 0,
        isPlus: profile.isPlus || false,
        senderRole: profile.role || "user",
        text: stickerEmoji,
        createdAt: serverTimestamp(),
        type: "sticker" as const,
        stickerUrl: label,
      };
      await addDoc(collection(db, `chats/${activeChat.id}/messages`), msgData);
      await updateDoc(doc(db, "chats", activeChat.id), {
        lastMessage: `${stickerEmoji} [Стикер] ${label}`,
        lastMessageAt: serverTimestamp(),
      });
      playAudioTone("send");
      setShowEmoji(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Forward message safely without undefined keys
  const forwardMessageToChat = async (targetChatId: string) => {
    if (!forwardingMessage || !profile) return;
    try {
      const msgData: Record<string, any> = {
        chatId: targetChatId,
        senderId: profile.uid,
        senderName: profile.displayName,
        senderNumericId: profile.id || 0,
        isPlus: profile.isPlus || false,
        senderRole: profile.role || "user",
        text: forwardingMessage.text || "",
        createdAt: serverTimestamp(),
        type: forwardingMessage.type || "text",
        isForwarded: true,
        forwardedFrom: forwardingMessage.senderName,
      };
      if (forwardingMessage.attachment) {
        msgData.attachment = forwardingMessage.attachment;
      }
      if (forwardingMessage.voiceDuration) {
        msgData.voiceDuration = forwardingMessage.voiceDuration;
      }
      if (forwardingMessage.voiceWaveform) {
        msgData.voiceWaveform = forwardingMessage.voiceWaveform;
      }
      if (forwardingMessage.stickerUrl) {
        msgData.stickerUrl = forwardingMessage.stickerUrl;
      }
      await addDoc(collection(db, `chats/${targetChatId}/messages`), msgData);
      await updateDoc(doc(db, "chats", targetChatId), {
        lastMessage: `[Переслано] ${forwardingMessage.text || "Вложение"}`,
        lastMessageAt: serverTimestamp(),
      });
      playAudioTone("send");
      addNotification("Сообщение переслано!", "success");
      setForwardingMessage(null);
    } catch (err) {
      console.error(err);
      addNotification("Ошибка пересылки сообщения", "error");
    }
  };

  const handleFileUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "*/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (file.type.startsWith("image/")) {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          img.src = loadEvt.target?.result as string;
        };
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.75);
          setAttachedFile({
            name: file.name,
            size: Math.round(compressedDataUrl.length * 0.75),
            type: "image/jpeg",
            dataUrl: compressedDataUrl,
          });
          addNotification(`Фото «${file.name}» оптимизировано и прикреплено`, "success");
        };
        reader.readAsDataURL(file);
      } else {
        if (file.size > 600 * 1024) {
          addNotification("Размер файла не должен превышать 600 КБ", "error");
          return;
        }
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          setAttachedFile({
            name: file.name,
            size: file.size,
            type: file.type || "application/octet-stream",
            dataUrl: loadEvt.target?.result as string,
          });
          addNotification(`Файл «${file.name}» прикреплен и готов к отправке`, "success");
        };
        reader.readAsDataURL(file);
      }
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
        if (!data.memberIds?.includes(profile.uid)) {
          await updateDoc(globalChatRef, {
            memberIds: [...(data.memberIds || []), profile.uid],
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
        const seen = new Set<string>();
        const uniqueChats: Chat[] = [];
        snapshot.docs.forEach((d) => {
          if (!seen.has(d.id)) {
            seen.add(d.id);
            uniqueChats.push({ id: d.id, ...d.data() } as Chat);
          }
        });
        setChats(uniqueChats);
      },
      (err) => {
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
        const seen = new Set<string>();
        const uniqueMessages: Message[] = [];
        snapshot.docs.forEach((d) => {
          if (!seen.has(d.id)) {
            seen.add(d.id);
            uniqueMessages.push({ id: d.id, ...d.data() } as Message);
          }
        });
        setMessages(uniqueMessages);
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
    if ((!inputText.trim() && !attachedFile) || !activeChat || !profile) return;

    if (
      profile.isMuted &&
      (!profile.muteExpires || profile.muteExpires.toDate() > new Date())
    ) {
      addNotification(`Вы замучены. Причина: ${profile.muteReason}`, "error");
      return;
    }

    if (partnerProfile?.isBanned || profile.isBanned) {
      addNotification("Общение с заблокированным пользователем недоступно", "error");
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
        const finalAttachment = attachedFile || null;
        const msgText = inputText.trim() || (finalAttachment ? `📎 ${finalAttachment.name}` : "");
        const msgData: any = {
          chatId: activeChat.id,
          senderId: profile.uid,
          senderName: profile.displayName,
          senderNumericId: profile.id || 0,
          isPlus: profile.isPlus || false,
          senderRole: profile.role || "user",
          text: msgText,
          createdAt: serverTimestamp(),
          type: finalAttachment ? "file" : "text",
        };
        if (finalAttachment) {
          msgData.attachment = finalAttachment;
        }
        if (replyingTo) {
          msgData.replyTo = {
            id: replyingTo.id,
            text: replyingTo.text,
            senderName: replyingTo.senderName,
          };
          setReplyingTo(null);
        }
        await addDoc(
          collection(db, `chats/${activeChat.id}/messages`),
          msgData,
        );
        await updateDoc(doc(db, "chats", activeChat.id), {
          lastMessage: msgText,
          lastMessageAt: serverTimestamp(),
        });
        playAudioTone("send");
      }
      setInputText("");
      setAttachedFile(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "messages");
    }
  };

  const createGroup = async (name: string) => {
    if (!profile) return;
    try {
      const groupData = {
        type: "group",
        name,
        avatarURL: `https://api.dicebear.com/7.x/initials/svg?seed=${name}`,
        creatorId: profile.uid,
        memberIds: [profile.uid],
        createdAt: serverTimestamp(),
        lastMessage: "Группа создана",
        lastMessageAt: serverTimestamp(),
      };
      const chatRef = await addDoc(collection(db, "chats"), groupData);
      setPartnerProfile(null);
      setActiveChat({ id: chatRef.id, ...groupData } as any);
      setShowGroupCreate(false);
      addNotification("Группа успешно создана", "success");
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
        setPartnerProfile(null);
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
        setPartnerProfile(null);
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
    profile?.email === "iluha1032020@gmail.com" ||
    profile?.email === "iluha032020@gmail.com";
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
              .map((chat, chatIdx) => (
                <motion.div
                  key={`chat-${chat.id || chatIdx}`}
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
                  <div className="flex items-center gap-2">
                    <h2 className="font-black text-xl tracking-tighter uppercase">
                      {activeChat.type === "direct"
                        ? partnerProfile?.displayName || activeChat.name
                        : activeChat.name}
                    </h2>
                    {activeChat.type === "direct" && partnerProfile?.isBanned && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-[10px] font-bold text-rose-400">
                        <Ban className="w-3 h-3 text-rose-400" />
                        Заблокирован
                      </span>
                    )}
                  </div>
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
              <div className="flex items-center gap-1.5">
                {/* Search in chat */}
                <button
                  title="Поиск в чате"
                  onClick={() => {
                    setChatSearchOpen(!chatSearchOpen);
                    if (chatSearchOpen) setChatSearchQuery("");
                  }}
                  className={`p-2.5 rounded-2xl transition-all ${
                    chatSearchOpen
                      ? "bg-blue-600 text-white"
                      : profile?.theme === "light"
                        ? "hover:bg-slate-100 text-slate-500"
                        : "hover:bg-white/10 text-white/50 hover:text-white"
                  }`}
                >
                  <SearchIcon className="w-5 h-5" />
                </button>

                {/* Mute Chat */}
                <button
                  title={activeChat.mutedBy?.includes(profile?.uid || "") ? "Включить звук" : "Заглушить чат"}
                  onClick={() => toggleMuteChat(activeChat.id)}
                  className={`p-2.5 rounded-2xl transition-all ${
                    activeChat.mutedBy?.includes(profile?.uid || "")
                      ? "bg-amber-500/20 text-amber-500"
                      : profile?.theme === "light"
                        ? "hover:bg-slate-100 text-slate-500"
                        : "hover:bg-white/10 text-white/50 hover:text-white"
                  }`}
                >
                  {activeChat.mutedBy?.includes(profile?.uid || "") ? (
                    <BellOff className="w-5 h-5" />
                  ) : (
                    <Bell className="w-5 h-5" />
                  )}
                </button>

                {/* Add member (group) */}
                {activeChat.type === "group" && (
                  <button
                    title={t.addMember}
                    onClick={() => setShowUserSearch(true)}
                    className={`p-2.5 rounded-2xl transition-all ${profile?.theme === "light" ? "hover:bg-green-50 text-green-600" : "hover:bg-green-500/10 text-green-500"}`}
                  >
                    <UserPlus className="w-5 h-5" />
                  </button>
                )}

                {/* Info */}
                <button
                  title={isAdmin ? "Админ-действия / Инфо" : "Информация"}
                  onClick={() =>
                    partnerProfile
                      ? setShowUserInfo(partnerProfile)
                      : activeChat.type === "group"
                        ? setShowGroupInfo(activeChat)
                        : null
                  }
                  className={`p-2.5 rounded-2xl transition-all ${profile?.theme === "light" ? "hover:bg-slate-100 text-slate-400" : "hover:bg-white/5 text-white/40 hover:text-white"}`}
                >
                  <Info className="w-5 h-5" />
                </button>

                {/* More Options Menu (Export, etc.) */}
                <div className="relative">
                  <button
                    title="Опции чата"
                    onClick={() => setShowChatOptionsMenu(!showChatOptionsMenu)}
                    className={`p-2.5 rounded-2xl transition-all ${profile?.theme === "light" ? "hover:bg-slate-100 text-slate-400" : "hover:bg-white/5 text-white/40 hover:text-white"}`}
                  >
                    <MoreIcon className="w-5 h-5" />
                  </button>

                  <AnimatePresence>
                    {showChatOptionsMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className={`absolute right-0 top-full mt-2 w-56 rounded-2xl shadow-2xl border p-2 z-50 backdrop-blur-2xl ${
                          profile?.theme === "light"
                            ? "bg-white/95 border-slate-200 text-slate-800"
                            : "bg-[#0f172a]/95 border-white/10 text-white"
                        }`}
                      >
                        <button
                          onClick={exportChatHistory}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-600/10 hover:text-blue-500 transition-colors text-left"
                        >
                          <Download className="w-4 h-4 text-blue-500" />
                          <span>Экспорт переписки (.txt)</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowChatOptionsMenu(false);
                            if (activeChat.pinnedMessage) {
                              document.getElementById(`msg-${activeChat.pinnedMessage.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                            } else {
                              addNotification("Нет закрепленных сообщений", "info");
                            }
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-white/10 transition-colors text-left"
                        >
                          <Pin className="w-4 h-4 text-yellow-500" />
                          <span>К закрепленному</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowChatOptionsMenu(false);
                            toggleMuteChat(activeChat.id);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-white/10 transition-colors text-left"
                        >
                          <Bell className="w-4 h-4 text-purple-500" />
                          <span>{activeChat.mutedBy?.includes(profile?.uid || "") ? "Включить звук" : "Без звука"}</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="w-[1px] h-6 bg-white/5 mx-1 self-center block" />
                <button
                  title="Магазин Nova Plus"
                  onClick={() => setShowStore(true)}
                  className={`p-2.5 rounded-2xl transition-all group ${profile?.theme === "light" ? "hover:bg-blue-50 text-blue-600" : "hover:bg-blue-500/10 text-blue-500"}`}
                >
                  <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </div>

            {/* Pinned Message Sticky Bar */}
            {activeChat.pinnedMessage && (
              <div
                className={`px-6 py-2 border-b flex items-center justify-between text-xs backdrop-blur-md z-10 transition-all ${
                  profile?.theme === "light"
                    ? "bg-blue-50/90 border-blue-100 text-blue-900"
                    : "bg-blue-950/40 border-blue-500/20 text-blue-200"
                }`}
              >
                <button
                  onClick={() =>
                    document
                      .getElementById(`msg-${activeChat.pinnedMessage?.id}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "center" })
                  }
                  className="flex items-center gap-3 truncate text-left flex-1 hover:opacity-80 transition-opacity"
                >
                  <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-500 shrink-0">
                    <Pin className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <span className="font-black text-[9px] uppercase tracking-wider block opacity-70">
                      Закрепленное сообщение ({activeChat.pinnedMessage.senderName})
                    </span>
                    <span className="truncate block font-semibold text-xs">
                      {activeChat.pinnedMessage.text}
                    </span>
                  </div>
                </button>
                <button
                  onClick={async () => {
                    await updateDoc(doc(db, "chats", activeChat.id), {
                      pinnedMessageId: null,
                      pinnedMessage: null,
                    });
                    addNotification("Сообщение откреплено", "info");
                  }}
                  className="p-1 hover:bg-white/10 rounded-lg ml-2 opacity-60 hover:opacity-100 transition-opacity"
                  title="Открепить"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* In-Chat Search Bar */}
            {chatSearchOpen && (
              <div
                className={`px-6 py-3 border-b flex items-center gap-3 z-10 backdrop-blur-xl ${
                  profile?.theme === "light"
                    ? "bg-slate-100/95 border-slate-200"
                    : "bg-[#0b1329]/95 border-white/10"
                }`}
              >
                <SearchIcon className="w-4 h-4 text-blue-500 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Поиск по сообщениям в этом чате..."
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm focus:outline-none font-medium"
                />
                {chatSearchQuery && (
                  <span className="text-[10px] font-black uppercase tracking-wider opacity-60">
                    {
                      messages.filter((m) =>
                        m.text?.toLowerCase().includes(chatSearchQuery.toLowerCase()),
                      ).length
                    }{" "}
                    совпадений
                  </span>
                )}
                <button
                  onClick={() => {
                    setChatSearchOpen(false);
                    setChatSearchQuery("");
                  }}
                  className="p-1.5 hover:bg-white/10 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-4 custom-scrollbar z-10">
              <div className="flex-1" />
              <AnimatePresence mode="popLayout">
                {messages
                  .filter((msg) =>
                    !chatSearchQuery
                      ? true
                      : msg.text?.toLowerCase().includes(chatSearchQuery.toLowerCase()),
                  )
                  .map((msg, msgIdx) => {
                    const isMe = msg.senderId === profile?.uid;
                    const hasReactions =
                      msg.reactions && Object.keys(msg.reactions).length > 0;

                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        key={`msg-${msg.id || msgIdx}`}
                        id={`msg-${msg.id || msgIdx}`}
                        onDoubleClick={() => toggleReaction(msg, "❤️")}
                        className={`flex ${isMe ? "justify-end" : "justify-start"} group relative`}
                      >
                        <div
                          className={`relative px-5 py-3 ${getBubbleRadiusClass(isMe)} max-w-[75%] md:max-w-[70%] shadow-2xl border transition-all duration-300 ${
                            isMe
                              ? styles.msgMe
                              : styles.msgThem
                          }`}
                        >
                          {/* Forwarded Tag */}
                          {msg.isForwarded && (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold opacity-75 italic mb-1.5 text-blue-400">
                              <Share2 className="w-3 h-3 shrink-0" />
                              <span>Переслано от {msg.forwardedFrom || "пользователя"}</span>
                            </div>
                          )}

                          {/* Quoted / Reply Preview */}
                          {msg.replyTo && (
                            <button
                              type="button"
                              onClick={() =>
                                document
                                  .getElementById(`msg-${msg.replyTo?.id}`)
                                  ?.scrollIntoView({ behavior: "smooth", block: "center" })
                              }
                              className="w-full text-left pl-3 py-1 mb-2 border-l-2 border-blue-500 bg-black/10 dark:bg-white/5 rounded-r-xl hover:opacity-80 transition-opacity text-xs"
                            >
                              <span className="font-black text-[9px] uppercase tracking-wider text-blue-400 block truncate">
                                {msg.replyTo.senderName}
                              </span>
                              <span className="opacity-80 line-clamp-1 text-[11px] font-medium">
                                {msg.replyTo.text}
                              </span>
                            </button>
                          )}

                          {/* Sender name for received messages */}
                          {!isMe && (
                            <div className="flex items-center gap-1 mb-1.5 min-w-0">
                              <p
                                className={`text-[10px] font-black uppercase tracking-widest truncate ${
                                  styles.accent === "green"
                                    ? "text-emerald-400"
                                    : "text-blue-500"
                                }`}
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

                          {/* Message Attachment Rendering */}
                          {msg.attachment && (
                            <div className="mb-2.5">
                              {msg.attachment.type?.startsWith("image/") && msg.attachment.dataUrl ? (
                                <div className="rounded-2xl overflow-hidden border border-white/10 max-w-sm">
                                  <img
                                    src={msg.attachment.dataUrl}
                                    alt={msg.attachment.name}
                                    className="w-full max-h-72 object-cover hover:scale-[1.01] transition-transform"
                                  />
                                </div>
                              ) : (
                                <a
                                  href={msg.attachment.dataUrl || "#"}
                                  download={msg.attachment.name}
                                  className="flex items-center gap-3 p-3 rounded-2xl bg-black/20 hover:bg-black/30 border border-white/10 transition-colors text-xs group"
                                >
                                  <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                                    <Download className="w-4 h-4" />
                                  </div>
                                  <div className="truncate">
                                    <p className="font-bold text-white truncate max-w-[200px]">{msg.attachment.name}</p>
                                    <p className="text-[10px] opacity-60">
                                      {msg.attachment.size ? `${(msg.attachment.size / 1024).toFixed(1)} КБ` : "Файл"} • Скачать
                                    </p>
                                  </div>
                                </a>
                              )}
                            </div>
                          )}

                          {/* Message Content: Voice Note */}
                          {msg.type === "voice" ? (
                            <div className="flex items-center gap-3 py-1 min-w-[160px]">
                              <button
                                onClick={() => playVoiceMessage(msg.id, msg.voiceDuration || 3, msg.attachment?.dataUrl)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-lg ${
                                  playingVoiceId === msg.id
                                    ? "bg-blue-600 text-white animate-pulse"
                                    : isMe
                                      ? "bg-white/20 text-white"
                                      : "bg-blue-600 text-white"
                                }`}
                              >
                                {playingVoiceId === msg.id ? (
                                  <Pause className="w-5 h-5" />
                                ) : (
                                  <Play className="w-5 h-5 ml-0.5" />
                                )}
                              </button>
                              <div className="flex flex-col gap-1 flex-1">
                                <div className="flex items-center gap-1 h-5">
                                  {(msg.voiceWaveform && msg.voiceWaveform.length > 0
                                    ? msg.voiceWaveform
                                    : [35, 70, 40, 90, 60, 100, 45, 80, 55, 95, 35, 75]
                                  ).map((h, idx) => (
                                    <div
                                      key={`${msg.id}-bar-${idx}`}
                                      style={{ height: `${Math.max(4, h * 0.22)}px` }}
                                      className={`w-1 rounded-full transition-all ${
                                        playingVoiceId === msg.id
                                          ? "bg-blue-400 animate-pulse"
                                          : isMe
                                            ? "bg-white/70"
                                            : "bg-blue-500/70"
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-[10px] font-bold opacity-70">
                                  0:{((msg.voiceDuration || 3) < 10 ? "0" : "") + (msg.voiceDuration || 3)}
                                </span>
                              </div>
                            </div>
                          ) : msg.type === "sticker" ? (
                            <div className="py-2 text-center">
                              <span className="text-6xl inline-block hover:scale-125 transition-transform cursor-pointer select-none">
                                {msg.text}
                              </span>
                            </div>
                          ) : (
                            <p className={`${getFontSizeClass()} font-medium whitespace-pre-wrap break-words`}>
                              {msg.text}
                            </p>
                          )}

                          {/* Timestamp & Status */}
                          <div className="flex items-center justify-end gap-2 mt-2 opacity-50">
                            {msg.pinned && (
                              <Pin
                                className="w-3 h-3 text-yellow-400"
                                title="Закреплено"
                              />
                            )}
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

                          {/* Real-time Reaction Badges */}
                          {hasReactions && (
                            <div className="flex flex-wrap gap-1.5 mt-2.5 pt-1.5 border-t border-white/5">
                              {Object.entries(msg.reactions || {}).map(
                                ([emoji, val]) => {
                                  const uids = Array.isArray(val) ? (val as string[]) : [];
                                  if (uids.length === 0) return null;
                                  const userReacted = profile
                                    ? uids.includes(profile.uid)
                                    : false;
                                  return (
                                    <motion.button
                                      whileTap={{ scale: 0.9 }}
                                      whileHover={{ scale: 1.08 }}
                                      key={`${msg.id}-rxn-${emoji}`}
                                      onClick={() => toggleReaction(msg, emoji)}
                                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all border ${
                                        userReacted
                                          ? "bg-blue-500/25 border-blue-400 text-blue-300 ring-1 ring-blue-400/40 shadow-sm"
                                          : "bg-white/5 hover:bg-white/10 border-white/10 text-white/80"
                                      }`}
                                      title={`${uids.length} ${
                                        uids.length === 1 ? "пользователь" : "пользователей"
                                      }`}
                                    >
                                      <span className="text-sm leading-none">{emoji}</span>
                                      <span className="text-[10px]">{uids.length}</span>
                                    </motion.button>
                                  );
                                },
                              )}
                            </div>
                          )}

                          {/* Quick Reactions & Action Toolbar (Hover / Click) */}
                          <div
                            className={`absolute ${
                              isMe ? "right-0 bottom-full mb-2" : "left-0 bottom-full mb-2"
                            } opacity-0 group-hover:opacity-100 flex items-center gap-1 p-1 rounded-2xl shadow-2xl border backdrop-blur-2xl transition-all z-20 ${
                              profile?.theme === "light"
                                ? "bg-white/95 border-slate-200"
                                : "bg-[#0b1329]/95 border-white/15"
                            }`}
                          >
                            {/* Quick Reactions Row */}
                            <div className="flex items-center gap-0.5 pr-1 border-r border-white/10">
                              {quickReactions.slice(0, 6).map((emoji) => (
                                <button
                                  key={`${msg.id}-qr-${emoji}`}
                                  onClick={() => toggleReaction(msg, emoji)}
                                  className="w-7 h-7 flex items-center justify-center hover:scale-125 transition-transform text-sm rounded-lg hover:bg-white/10"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>

                            {/* Reply */}
                            <button
                              onClick={() => {
                                setReplyingTo(msg);
                                setEditingMessage(null);
                              }}
                              className="p-1.5 hover:bg-white/10 rounded-xl transition-colors text-white/50 hover:text-white"
                              title="Ответить"
                            >
                              <CornerUpLeft className="w-3.5 h-3.5 text-blue-400" />
                            </button>

                            {/* Pin / Unpin */}
                            <button
                              onClick={() => togglePinMessage(msg)}
                              className={`p-1.5 hover:bg-white/10 rounded-xl transition-colors ${
                                msg.pinned ? "text-yellow-400" : "text-white/50 hover:text-white"
                              }`}
                              title={msg.pinned ? "Открепить" : "Закрепить"}
                            >
                              <Pin className="w-3.5 h-3.5" />
                            </button>

                            {/* Forward */}
                            <button
                              onClick={() => setForwardingMessage(msg)}
                              className="p-1.5 hover:bg-white/10 rounded-xl transition-colors text-white/50 hover:text-white"
                              title="Переслать"
                            >
                              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                            </button>

                            {/* Edit (if sender) */}
                            {isMe && (
                              <button
                                onClick={() => {
                                  setEditingMessage(msg);
                                  setInputText(msg.text);
                                  setReplyingTo(null);
                                }}
                                className="p-1.5 hover:bg-white/10 rounded-xl transition-colors text-white/50 hover:text-white"
                                title="Изменить"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                              </button>
                            )}

                            {/* Delete */}
                            {(isMe || isAdmin || profile?.id === 1) && (
                              <button
                                onClick={() => {
                                  deleteDoc(
                                    doc(
                                      db,
                                      `chats/${activeChat.id}/messages`,
                                      msg.id,
                                    ),
                                  );
                                }}
                                className="p-1.5 hover:bg-red-500/10 rounded-xl transition-colors text-red-500/50 hover:text-red-500"
                                title="Удалить"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
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
                {/* Editing Message Banner */}
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
                            Редактирование сообщения
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

                {/* Reply Message Banner */}
                <AnimatePresence>
                  {replyingTo && (
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 20, opacity: 0 }}
                      className="flex items-center justify-between bg-blue-500/10 p-3.5 rounded-2xl text-xs text-blue-400 border border-blue-500/20 backdrop-blur-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-1.5 rounded-lg text-white shadow-md">
                          <CornerUpLeft className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black uppercase tracking-widest text-[9px] text-blue-400">
                            Ответ для {replyingTo.senderName}
                          </span>
                          <span className="opacity-70 truncate max-w-[200px] md:max-w-[450px] font-medium text-xs">
                            {replyingTo.text}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Voice Recording Bar */}
                <AnimatePresence>
                  {isRecordingVoice && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center justify-between bg-rose-500/15 border border-rose-500/30 p-4 rounded-3xl backdrop-blur-xl"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-3.5 h-3.5 bg-rose-500 rounded-full animate-ping" />
                        <span className="text-xs font-black uppercase tracking-widest text-rose-400">
                          Запись аудио... 0:0{voiceRecordSeconds}
                        </span>
                        <div className="flex items-center gap-1 ml-3">
                          {[30, 80, 50, 100, 40, 70, 90, 60].map((h, i) => (
                            <div
                              key={i}
                              style={{ height: `${h * 0.18}px` }}
                              className="w-1 bg-rose-500 rounded-full animate-pulse"
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={cancelVoiceRecording}
                          className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 text-white/80 transition-all"
                        >
                          Отмена
                        </button>
                        <button
                          onClick={finishVoiceRecording}
                          className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all"
                        >
                          Отправить
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Attached File Preview Bar */}
                <AnimatePresence>
                  {attachedFile && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.98 }}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 backdrop-blur-2xl"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {attachedFile.type.startsWith("image/") && attachedFile.dataUrl ? (
                          <img
                            src={attachedFile.dataUrl}
                            alt={attachedFile.name}
                            className="w-12 h-12 rounded-xl object-cover border border-cyan-500/40 shrink-0 shadow-lg"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                            <AttachIcon className="w-5 h-5" />
                          </div>
                        )}
                        <div className="truncate">
                          <p className="font-bold text-white text-xs truncate max-w-sm">{attachedFile.name}</p>
                          <p className="text-[10px] text-cyan-400 font-mono">
                            {(attachedFile.size / 1024).toFixed(1)} КБ • Готов к отправке
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setAttachedFile(null)}
                        className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors"
                        title="Удалить прикрепленный файл"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Ban Status Notice or Input Bar */}
                {(activeChat.type === "direct" && partnerProfile?.isBanned) || profile?.isBanned ? (
                  <div className="flex items-center justify-center gap-3 py-5 px-6 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-400 backdrop-blur-2xl shadow-xl">
                    <Ban className="w-6 h-6 shrink-0 text-rose-500" />
                    <div className="text-left">
                      <p className="text-sm font-bold">
                        {activeChat.type === "direct" && partnerProfile?.isBanned
                          ? "Пользователь заблокирован администрацией"
                          : "Ваш аккаунт заблокирован"}
                      </p>
                      <p className="text-xs text-rose-300/80">
                        Отправка сообщений, файлов и голосовых заметок недоступна.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Input Bar */
                  <div
                    className={`flex items-center gap-3 border border-white/10 rounded-[32px] p-2 pr-5 transition-all focus-within:ring-2 focus-within:ring-blue-500/40 group relative ${styles.input}`}
                  >
                    <div className="relative">
                      <button
                        onClick={() => setShowEmoji(!showEmoji)}
                        title="Смайлы и стикеры"
                        className={`p-3 rounded-full transition-all ${
                          showEmoji
                            ? "bg-blue-600 text-white"
                            : "hover:bg-white/5 opacity-40 hover:opacity-100"
                        }`}
                      >
                        <EmojiIcon className="w-6 h-6" />
                      </button>

                      <AnimatePresence>
                        {showEmoji && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`absolute bottom-full left-0 mb-4 w-72 rounded-3xl shadow-2xl border backdrop-blur-2xl z-50 overflow-hidden ${
                              profile?.theme === "light"
                                ? "bg-white/95 border-slate-200"
                                : "bg-[#0f172a]/95 border-white/10"
                            }`}
                          >
                            {/* Tabs */}
                            <div className="flex border-b border-white/10 p-1.5 gap-1 bg-black/10">
                              <button
                                onClick={() => setEmojiTab("emojis")}
                                className={`flex-1 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                                  emojiTab === "emojis"
                                    ? "bg-blue-600 text-white shadow-md"
                                    : "opacity-50 hover:opacity-100"
                                }`}
                              >
                                Смайлы
                              </button>
                              <button
                                onClick={() => setEmojiTab("stickers")}
                                className={`flex-1 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                                  emojiTab === "stickers"
                                    ? "bg-blue-600 text-white shadow-md"
                                    : "opacity-50 hover:opacity-100"
                                }`}
                              >
                                Стикеры
                              </button>
                            </div>

                            {emojiTab === "emojis" ? (
                              <div className="grid grid-cols-5 gap-1 p-3 max-h-56 overflow-y-auto custom-scrollbar">
                                {emojis.map((e) => (
                                  <button
                                    key={e}
                                    onClick={() => addEmoji(e)}
                                    className={`text-2xl p-2 rounded-xl transition-all hover:scale-125 ${
                                      profile?.theme === "light"
                                        ? "hover:bg-slate-100"
                                        : "hover:bg-white/10"
                                    }`}
                                  >
                                    {e}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="grid grid-cols-3 gap-2 p-3 max-h-56 overflow-y-auto custom-scrollbar">
                                {stickerPack.map((stk) => (
                                  <button
                                    key={stk.label}
                                    onClick={() => sendSticker(stk.emoji, stk.label)}
                                    className="flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 hover:scale-105 active:scale-95 transition-all text-center group"
                                    title={stk.label}
                                  >
                                    <span className="text-3xl group-hover:scale-115 transition-transform">
                                      {stk.emoji}
                                    </span>
                                    <span className="text-[9px] font-bold opacity-60 truncate w-full">
                                      {stk.label}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {isRecordingVoice ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex-1 flex items-center justify-between gap-3 px-2 py-1"
                      >
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="w-3.5 h-3.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.9)]" />
                          <span className="font-mono text-sm font-black text-red-400 tabular-nums">
                            00:{voiceRecordSeconds < 10 ? `0${voiceRecordSeconds}` : voiceRecordSeconds}
                          </span>
                          <span className="text-[10px] text-white/40 uppercase font-black tracking-wider hidden sm:inline">
                            / 01:00
                          </span>
                        </div>

                        {/* Live Waveform Visualizer from Microphone */}
                        <div className="flex items-center gap-1 h-8 flex-1 max-w-[260px] px-2 justify-center">
                          {liveWaveform.map((h, i) => (
                            <div
                              key={`live-wave-${i}`}
                              style={{ height: `${Math.max(10, h * 0.32)}px` }}
                              className="w-1.5 bg-gradient-to-t from-blue-600 to-cyan-400 rounded-full transition-all duration-75"
                            />
                          ))}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Cancel button */}
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.9 }}
                            type="button"
                            onClick={cancelVoiceRecording}
                            title="Отменить запись (нажмите или смахните)"
                            className="px-3.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Отмена</span>
                          </motion.button>

                          {/* Send button */}
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            type="button"
                            onClick={finishVoiceRecording}
                            title="Отправить голосовое сообщение"
                            className="p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xl shadow-blue-500/40 transition-all flex items-center justify-center"
                          >
                            <SendIcon className="w-5 h-5 translate-x-0.5 -translate-y-0.5 rotate-[-15deg]" />
                          </motion.button>
                        </div>
                      </motion.div>
                    ) : (
                      <>
                        <button
                          onClick={handleFileUpload}
                          title="Прикрепить файл"
                          className="p-3 hover:bg-white/5 rounded-full transition-colors text-blue-500"
                        >
                          <AttachIcon className="w-6 h-6" />
                        </button>

                        <input
                          type="text"
                          placeholder={isMuted ? "Вы замучены" : t.writeMessage}
                          disabled={isMuted}
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                          className="flex-1 focus:outline-none text-[16px] bg-transparent py-3 px-2 font-medium"
                        />

                        {/* Mic / Voice Note Button */}
                        {!inputText.trim() && !attachedFile && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={startVoiceRecording}
                            title="Записать голосовое сообщение (до 60 сек)"
                            className="p-3.5 rounded-full text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-all"
                          >
                            <Mic className="w-6 h-6" />
                          </motion.button>
                        )}

                        {/* Send Button */}
                        {(inputText.trim() || attachedFile) && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={sendMessage}
                            className="p-3.5 rounded-full text-white shadow-2xl transition-all bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/50 opacity-100"
                          >
                            <SendIcon className="w-6 h-6 transition-transform translate-x-0.5 -translate-y-0.5 rotate-[-15deg]" />
                          </motion.button>
                        )}
                      </>
                    )}
                  </div>
                )}
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
              className="p-8 rounded-[4rem] mb-6 backdrop-blur-3xl border border-white/10 shadow-[0_0_100px_rgba(37,99,235,0.15)] relative z-10 group flex items-center justify-center"
            >
              <ThreeHoloOrb size={220} interactive={true} />
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
        {forwardingMessage && (
          <ForwardModal
            message={forwardingMessage}
            chats={chats}
            profile={profile}
            onClose={() => setForwardingMessage(null)}
            onForward={forwardMessageToChat}
            onOpenSaved={openSavedMessages}
          />
        )}
        {showSettings && (
          <SettingsModal
            profile={profile}
            onClose={() => setShowSettings(false)}
            onOpenSpoonGame={() => {
              setShowSettings(false);
              setShowSpoonGame(true);
            }}
          />
        )}
        {showSpoonGame && (
          <SpoonParkourGame onClose={() => setShowSpoonGame(false)} />
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
  onOpenSpoonGame,
}: {
  profile: UserProfile | null;
  onClose: () => void;
  onOpenSpoonGame?: () => void;
}) {
  const lang: Language = profile?.language || "ru";
  const t = translations[lang];

  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [handle, setHandle] = useState(profile?.handle || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [localTheme, setLocalTheme] = useState<Theme>(
    profile?.theme || "oled",
  );
  const [localLang, setLocalLang] = useState<Language>(lang);
  const [localFontSize, setLocalFontSize] = useState<"small" | "normal" | "large">(
    profile?.fontSize || "normal",
  );
  const [localBubbleStyle, setLocalBubbleStyle] = useState<"modern" | "rounded" | "sharp">(
    profile?.bubbleStyle || "modern",
  );
  const [localSoundEnabled, setLocalSoundEnabled] = useState<boolean>(
    profile?.soundEnabled !== false,
  );
  const [catClicks, setCatClicks] = useState(0);
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
      fontSize: localFontSize,
      bubbleStyle: localBubbleStyle,
      soundEnabled: localSoundEnabled,
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

          {/* 6 Custom Themes */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">
              Темы оформления (6 тем)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  id: "oled",
                  name: "Midnight OLED",
                  desc: "Глубокий черный",
                  color: "bg-black border-cyan-500/30 text-white",
                  icon: <Monitor className="w-4 h-4 text-cyan-400" />,
                },
                {
                  id: "emerald",
                  name: "Изумруд",
                  desc: "Нефритовый лес",
                  color: "bg-[#04140e] border-emerald-500/30 text-emerald-300",
                  icon: <Sparkles className="w-4 h-4 text-emerald-400" />,
                },
                {
                  id: "cyber",
                  name: "Неон",
                  desc: "Кибернетический",
                  color: "bg-[#040810] border-cyan-500/30 text-cyan-300",
                  icon: <Zap className="w-4 h-4 text-cyan-400" />,
                },
                {
                  id: "sunset",
                  name: "Закат",
                  desc: "Пурпурно-алый",
                  color: "bg-[#140818] border-rose-500/30 text-rose-300",
                  icon: <Heart className="w-4 h-4 text-rose-400" />,
                },
                {
                  id: "nordic",
                  name: "Нордик",
                  desc: "Арктический лед",
                  color: "bg-[#09111e] border-sky-500/30 text-sky-300",
                  icon: <Moon className="w-4 h-4 text-sky-400" />,
                },
                {
                  id: "telegram",
                  name: "Telegram",
                  desc: "Классика ТГ",
                  color: "bg-[#0e1621] border-[#223345] text-blue-300",
                  icon: <MessageCircle className="w-4 h-4 text-blue-400" />,
                },
                {
                  id: "light",
                  name: "Светлая",
                  desc: "Чистый минимализм",
                  color: "bg-slate-100 border-slate-300 text-slate-800",
                  icon: <Sun className="w-4 h-4 text-amber-500" />,
                },
              ].map((tInfo) => (
                <button
                  key={tInfo.id}
                  type="button"
                  onClick={() => setLocalTheme(tInfo.id as Theme)}
                  className={`p-3 rounded-2xl border flex flex-col items-start gap-1 transition-all ${
                    localTheme === tInfo.id
                      ? "border-blue-500 ring-2 ring-blue-500/40 bg-blue-500/15"
                      : "border-white/5 hover:bg-white/5 opacity-70 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {tInfo.icon}
                    <span className="text-xs font-bold leading-tight">
                      {tInfo.name}
                    </span>
                  </div>
                  <span className="text-[9px] opacity-60 leading-none">
                    {tInfo.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Font Size Selector */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">
              Размер текста сообщений
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "small", label: "Мелкий (13px)" },
                { id: "normal", label: "Стандарт (15px)" },
                { id: "large", label: "Крупный (17px)" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setLocalFontSize(f.id as any)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    localFontSize === f.id
                      ? "border-blue-500 bg-blue-500/15 text-blue-400"
                      : "border-white/5 hover:bg-white/5 opacity-60"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bubble Style Selector */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">
              Форма пузырей сообщений
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "modern", label: "Modern" },
                { id: "rounded", label: "Rounded" },
                { id: "sharp", label: "Sharp" },
              ].map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setLocalBubbleStyle(b.id as any)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    localBubbleStyle === b.id
                      ? "border-blue-500 bg-blue-500/15 text-blue-400"
                      : "border-white/5 hover:bg-white/5 opacity-60"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sound Effects Toggle */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold">Звуковые сигналы</p>
                <p className="text-[10px] opacity-60">Звук при отправке сообщений</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLocalSoundEnabled(!localSoundEnabled)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                localSoundEnabled
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "bg-white/10 text-white/50"
              }`}
            >
              {localSoundEnabled ? "Вкл" : "Выкл"}
            </button>
          </div>
          <button
            onClick={save}
            className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] mt-4 shadow-2xl shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-95"
          >
            {t.save}
          </button>

          {/* Cat Easter Egg for 3D Spoon Parkour Game */}
          <div className="pt-4 pb-1 flex flex-col items-center justify-center select-none border-t border-white/5 mt-5">
            <motion.button
              type="button"
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              onClick={() => {
                try {
                  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                  if (AudioCtx) {
                    const ctx = new AudioCtx();
                    const now = ctx.currentTime;
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(450, now);
                    osc.frequency.exponentialRampToValueAtTime(800, now + 0.12);
                    osc.frequency.exponentialRampToValueAtTime(500, now + 0.28);
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.linearRampToValueAtTime(0.01, now + 0.28);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.28);
                  }
                } catch {}

                const next = catClicks + 1;
                setCatClicks(next);
                if (next >= 5) {
                  setCatClicks(0);
                  if (onOpenSpoonGame) {
                    onOpenSpoonGame();
                  }
                }
              }}
              className="group relative flex items-center justify-center w-14 h-14 rounded-2xl bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/40 transition-all cursor-pointer shadow-lg"
              title="Мяу? Нажми 5 раз!"
            >
              <span className="text-3xl group-hover:scale-125 transition-transform duration-200">🐱</span>
              {catClicks > 0 && (
                <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-black shadow-lg animate-bounce">
                  {catClicks}/5
                </span>
              )}
            </motion.button>
            <p className="text-[10px] text-white/50 mt-2 font-bold tracking-wider uppercase">
              {catClicks === 0 ? "Секретный котик Nova" : `Котик доволен: ${catClicks} из 5 (нажми ещё ${5 - catClicks})`}
            </p>
          </div>
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

function ForwardModal({
  message,
  chats,
  profile,
  onClose,
  onForward,
  onOpenSaved,
}: {
  message: Message;
  chats: Chat[];
  profile: UserProfile | null;
  onClose: () => void;
  onForward: (chatId: string) => void;
  onOpenSaved: () => void;
}) {
  const isLight = profile?.theme === "light";
  const [queryText, setQueryText] = useState("");

  const filteredChats = chats.filter((c) =>
    (c.name || "Чат").toLowerCase().includes(queryText.toLowerCase()),
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[90] bg-black/75 backdrop-blur-2xl flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className={`w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl border ${
          isLight
            ? "bg-white text-slate-900 border-slate-200"
            : "bg-[#0f172a] text-white border-white/10"
        }`}
      >
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600/20 text-blue-500">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black italic tracking-tighter uppercase">
                Переслать сообщение
              </h2>
              <p className="text-[10px] opacity-50 uppercase tracking-widest font-bold">
                Выберите получателя
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message preview snippet */}
        <div className="p-3 mb-4 rounded-2xl bg-black/10 dark:bg-white/5 border border-white/5 text-xs">
          <span className="text-[10px] font-bold text-blue-400 block mb-0.5">
            {message.senderName}:
          </span>
          <p className="line-clamp-2 opacity-80">{message.text}</p>
        </div>

        {/* Quick Save to Избранное */}
        <button
          onClick={() => {
            if (profile) onForward(`saved_${profile.uid}`);
          }}
          className="w-full flex items-center gap-3 p-3 mb-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 transition-all text-left"
        >
          <div className="p-2 rounded-xl bg-yellow-500 text-white">
            <Bookmark className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-black uppercase text-yellow-500">
              В Избранное (Saved Messages)
            </p>
            <p className="text-[10px] opacity-60">Сохранить для себя</p>
          </div>
        </button>

        {/* Search */}
        <input
          type="text"
          placeholder="Поиск диалогов..."
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          className={`w-full p-3 rounded-2xl text-xs mb-3 outline-none ring-2 ring-transparent focus:ring-blue-500 transition-all ${
            isLight ? "bg-slate-100" : "bg-white/5"
          }`}
        />

        {/* Chat list */}
        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
          {filteredChats.map((c, cIdx) => (
            <button
              key={`fwd-chat-${c.id || cIdx}`}
              onClick={() => onForward(c.id)}
              className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-blue-600/10 hover:border-blue-500/30 border border-transparent transition-all text-left group"
            >
              <img
                src={c.avatarURL || `https://api.dicebear.com/7.x/initials/svg?seed=${c.name}`}
                className="w-10 h-10 rounded-xl object-cover"
                alt=""
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate group-hover:text-blue-400">
                  {c.name || "Диалог"}
                </p>
                <p className="text-[10px] opacity-50 truncate">
                  {c.lastMessage || "Нажмите для отправки"}
                </p>
              </div>
              <SendIcon className="w-4 h-4 opacity-30 group-hover:opacity-100 group-hover:text-blue-500 transition-all" />
            </button>
          ))}
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
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user" | "banned">("all");
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<UserProfile | null>(null);
  const [confirmRevokeUser, setConfirmRevokeUser] = useState<UserProfile | null>(null);
  const [editingIdUser, setEditingIdUser] = useState<UserProfile | null>(null);
  const [customIdInput, setCustomIdInput] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "users"), limit(100)),
      (snap) => {
        setUsers(snap.docs.map((d) => d.data() as UserProfile));
        setLoading(false);
      },
      (err) => {
        console.error("CreatorPanel error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // "Снести админку" or promote
  const handleToggleAdmin = async (targetUser: UserProfile) => {
    const isCurrentlyAdmin = targetUser.role === "admin";
    const newRole = isCurrentlyAdmin ? "user" : "admin";
    try {
      await updateDoc(doc(db, "users", targetUser.uid), { role: newRole });
      addNotification(
        isCurrentlyAdmin
          ? `Админка снесена с ${targetUser.displayName}`
          : `${targetUser.displayName} назначен администратором`,
        "success"
      );
      setConfirmRevokeUser(null);
    } catch (e) {
      console.error(e);
      addNotification("Ошибка смены роли", "error");
    }
  };

  // "Удаление аккаунта" with recycling numeric ID
  const handleDeleteAccount = async (targetUser: UserProfile) => {
    try {
      const configRef = doc(db, "system", "config");
      const configSnap = await getDoc(configRef);
      const availableIds = configSnap.data()?.availableIds || [];

      if (targetUser.id && targetUser.id > 1) {
        await updateDoc(configRef, {
          availableIds: [...new Set([...availableIds, targetUser.id])].sort((a, b) => a - b),
        });
      }
      await deleteDoc(doc(db, "users", targetUser.uid));
      setUsers((prev) => prev.filter((u) => u.uid !== targetUser.uid));
      addNotification(
        `Аккаунт ${targetUser.displayName} удален, ID #${targetUser.id} освобожден`,
        "success"
      );
      setConfirmDeleteUser(null);
    } catch (e) {
      console.error(e);
      addNotification("Ошибка при удалении аккаунта", "error");
    }
  };

  // Save new custom numeric ID
  const handleSaveCustomId = async () => {
    if (!editingIdUser) return;
    const parsed = parseInt(customIdInput, 10);
    if (isNaN(parsed) || parsed < 1) {
      addNotification("Введите положительное число ID", "error");
      return;
    }
    try {
      await updateDoc(doc(db, "users", editingIdUser.uid), { id: parsed });
      addNotification(`ID для ${editingIdUser.displayName} изменен на #${parsed}`, "success");
      setEditingIdUser(null);
      setCustomIdInput("");
    } catch (e) {
      console.error(e);
      addNotification("Ошибка при изменении ID", "error");
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      u.displayName?.toLowerCase().includes(q) ||
      u.handle?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      String(u.id).includes(q);

    if (!matchesSearch) return false;
    if (roleFilter === "admin") return u.role === "admin";
    if (roleFilter === "user") return u.role === "user" || !u.role;
    if (roleFilter === "banned") return u.isBanned === true;
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: 50, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        className={`w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col rounded-[3rem] shadow-2xl border ${
          isLight ? "bg-white border-slate-200" : "bg-[#0f172a] border-white/10"
        }`}
      >
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-yellow-500 p-3.5 rounded-2xl shadow-xl shadow-yellow-500/25">
              <UserCog className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-black italic tracking-tighter uppercase">
                Панель Создателя
              </h2>
              <p className="text-yellow-500 text-[10px] font-black uppercase tracking-[0.4em]">
                Supreme Access • Управление ролями, ID и аккаунтами
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-7 h-7" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {/* Controls: Search & Filter Tabs */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <SearchIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 opacity-40" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по нику, @handle, ID или email..."
                className={`w-full pl-12 pr-4 py-3.5 rounded-2xl outline-none ring-2 ring-transparent focus:ring-yellow-500 transition-all font-medium text-sm ${
                  isLight ? "bg-slate-100" : "bg-white/5 text-white"
                }`}
              />
            </div>
            <div className="flex gap-1.5 p-1 rounded-2xl bg-black/20 dark:bg-white/5 border border-white/5 self-start">
              {(
                [
                  { id: "all", label: `Все (${users.length})` },
                  { id: "admin", label: `Админы (${users.filter((u) => u.role === "admin").length})` },
                  { id: "user", label: "Юзеры" },
                  { id: "banned", label: "Бан" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setRoleFilter(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    roleFilter === tab.id
                      ? "bg-yellow-500 text-slate-950 font-black shadow-md"
                      : "opacity-60 hover:opacity-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* User List */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-3 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-20 opacity-40 font-bold uppercase tracking-widest text-xs">
              Пользователи не найдены
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredUsers.map((u) => {
                const isAdminUser = u.role === "admin";
                const isCreatorUser = u.role === "creator" || u.id === 1;

                return (
                  <div
                    key={u.uid}
                    className={`p-5 rounded-3xl border transition-all flex flex-col justify-between gap-4 ${
                      isLight
                        ? "bg-slate-50 border-slate-200"
                        : "bg-white/5 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={u.photoURL}
                          className="w-14 h-14 rounded-2xl object-cover shadow-lg shrink-0"
                          alt=""
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-base truncate">
                              {u.displayName}
                            </span>
                            <VerificationBadge
                              id={u.id}
                              isPlus={u.isPlus}
                              role={u.role}
                            />
                          </div>
                          <p className="text-[11px] text-blue-400 font-bold">
                            @{u.handle || "no_handle"}
                          </p>
                          <p className="text-[10px] opacity-40 font-mono truncate">
                            {u.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider">
                          ID: #{u.id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                            isCreatorUser
                              ? "bg-yellow-500/20 text-yellow-500"
                              : isAdminUser
                                ? "bg-rose-500/20 text-rose-400"
                                : "bg-white/10 text-white/60"
                          }`}
                        >
                          {u.role || "user"}
                        </span>
                      </div>
                    </div>

                    {/* Actions Toolbar */}
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5 flex-wrap">
                      {/* Снести админку / Выдать админку */}
                      {!isCreatorUser && (
                        <button
                          onClick={() => {
                            if (isAdminUser) {
                              setConfirmRevokeUser(u);
                            } else {
                              handleToggleAdmin(u);
                            }
                          }}
                          className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                            isAdminUser
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white"
                              : "bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white"
                          }`}
                        >
                          {isAdminUser ? (
                            <>
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>Снести админку</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Сделать админом</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Сменить ID */}
                      <button
                        onClick={() => {
                          setEditingIdUser(u);
                          setCustomIdInput(String(u.id));
                        }}
                        className="py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition-all flex items-center gap-1"
                        title="Изменить ID"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>ID</span>
                      </button>

                      {/* Удаление аккаунта */}
                      {!isCreatorUser && (
                        <button
                          onClick={() => setConfirmDeleteUser(u)}
                          className="py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider bg-red-600/15 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 transition-all flex items-center gap-1"
                          title="Удалить аккаунт навсегда"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Удалить аккаунт</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal: Confirm Revoke Admin ("Снести админку") */}
        <AnimatePresence>
          {confirmRevokeUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl ${
                  isLight ? "bg-white border-slate-200" : "bg-[#1e293b] border-white/10"
                }`}
              >
                <div className="flex items-center gap-3 mb-4 text-rose-500">
                  <ShieldAlert className="w-7 h-7" />
                  <h3 className="text-xl font-black uppercase tracking-tight">
                    Снести админку?
                  </h3>
                </div>
                <p className="text-xs font-medium opacity-80 mb-6 leading-relaxed">
                  Вы действительно хотите лишить прав администратора пользователя{" "}
                  <strong className="text-white font-bold">{confirmRevokeUser.displayName}</strong>?
                  Его роль будет возвращена на обычного пользователя.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmRevokeUser(null)}
                    className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-white/10 hover:bg-white/15 transition-all"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => handleToggleAdmin(confirmRevokeUser)}
                    className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all"
                  >
                    Да, снести админку
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal: Confirm Delete Account ("Удаление аккаунта") */}
        <AnimatePresence>
          {confirmDeleteUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl ${
                  isLight ? "bg-white border-slate-200" : "bg-[#1e293b] border-white/10"
                }`}
              >
                <div className="flex items-center gap-3 mb-4 text-red-500">
                  <Trash2 className="w-7 h-7" />
                  <h3 className="text-xl font-black uppercase tracking-tight">
                    Удалить аккаунт навсегда?
                  </h3>
                </div>
                <p className="text-xs font-medium opacity-80 mb-4 leading-relaxed">
                  ВНИМАНИЕ: Вы действительно хотите КОРРЕКТНО удалить аккаунт{" "}
                  <strong className="text-white font-bold">{confirmDeleteUser.displayName}</strong>?
                </p>
                <div className="p-3 mb-6 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-[11px] text-yellow-400 font-semibold">
                  Номер ID #{confirmDeleteUser.id} будет возвращен в пул свободных номеров для будущих регистраций.
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmDeleteUser(null)}
                    className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-white/10 hover:bg-white/15 transition-all"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => handleDeleteAccount(confirmDeleteUser)}
                    className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 transition-all"
                  >
                    Да, удалить навсегда
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal: Edit Custom Numeric ID */}
        <AnimatePresence>
          {editingIdUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className={`w-full max-w-sm p-6 rounded-3xl border shadow-2xl ${
                  isLight ? "bg-white border-slate-200" : "bg-[#1e293b] border-white/10"
                }`}
              >
                <h3 className="text-lg font-black uppercase tracking-tight mb-2">
                  Сменить ID для {editingIdUser.displayName}
                </h3>
                <p className="text-xs opacity-60 mb-4">
                  Текущий ID: #{editingIdUser.id}. Введите новый числовой ID:
                </p>
                <input
                  type="number"
                  autoFocus
                  value={customIdInput}
                  onChange={(e) => setCustomIdInput(e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-white/5 border border-white/10 font-mono text-center text-xl font-bold mb-5 outline-none ring-2 ring-transparent focus:ring-yellow-500"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditingIdUser(null)}
                    className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-white/10 hover:bg-white/15 transition-all"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSaveCustomId}
                    className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-yellow-500 text-slate-950 font-black shadow-lg shadow-yellow-500/20 transition-all"
                  >
                    Сохранить ID
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
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
  const [banDays, setBanDays] = useState("1");
  const [activeTab, setActiveTab] = useState<"moderation" | "logs" | "reports">("moderation");
  const [moderationLogs, setModerationLogs] = useState<ModerationLogEntry[]>([]);

  useEffect(() => {
    const unsubUsers = onSnapshot(
      query(collection(db, "users"), limit(100)),
      (snap) => {
        setUsers(snap.docs.map((d) => d.data() as UserProfile));
      },
      (err) => console.error("AdminPanel users error:", err)
    );
    return () => unsubUsers();
  }, []);

  // Real-time Moderation Logs listener
  useEffect(() => {
    const unsubLogs = onSnapshot(
      query(collection(db, "moderation_logs"), orderBy("createdAt", "desc"), limit(50)),
      (snap) => {
        setModerationLogs(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ModerationLogEntry)
        );
      },
      (err) => console.error("AdminPanel logs error:", err)
    );
    return () => unsubLogs();
  }, []);

  const searchUser = async () => {
    if (!targetId.trim()) return;
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
        const q2 = query(
          collection(db, "users"),
          where("handle", "==", targetId.toLowerCase()),
        );
        const snap2 = await getDocs(q2);
        if (!snap2.empty) {
          setSelectedUser(snap2.docs[0].data() as UserProfile);
          return;
        }
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
      addNotification("Ошибка поиска пользователя", "error");
    }
  };

  const moderate = async (
    type: "ban" | "mute" | "unban" | "unmute",
    presetHours?: number,
    presetLabel?: string
  ) => {
    if (!selectedUser) return;
    if (selectedUser.role === "creator" || selectedUser.id === 1)
      return addNotification("Нельзя наказывать создателя платформы!", "error");

    try {
      let expiry: Date | null = null;
      let durationText = "";

      if (type === "ban" || type === "mute") {
        const hours = presetHours !== undefined ? presetHours : (parseInt(banDays) || 1) * 24;
        expiry = new Date();
        expiry.setTime(expiry.getTime() + hours * 3600 * 1000);
        durationText = presetLabel || (hours >= 24 * 365 ? "Навсегда" : `${hours} ч.`);
      }

      let updates: any = {};
      if (type === "ban") {
        updates = { isBanned: true, banReason: banReason || "Нарушение правил", banExpires: expiry };
      } else if (type === "mute") {
        updates = { isMuted: true, muteReason: banReason || "Нарушение правил", muteExpires: expiry };
      } else if (type === "unban") {
        updates = { isBanned: false, banReason: null, banExpires: null };
        durationText = "Разблокирован";
      } else if (type === "unmute") {
        updates = { isMuted: false, muteReason: null, muteExpires: null };
        durationText = "Снят мут";
      }

      await updateDoc(doc(db, "users", selectedUser.uid), updates);

      // Record to audit trail
      try {
        await addDoc(collection(db, "moderation_logs"), {
          adminId: profile?.uid || "admin",
          adminName: profile?.displayName || "Admin",
          targetUserId: selectedUser.uid,
          targetUserName: selectedUser.displayName || `ID ${selectedUser.id}`,
          action: type,
          reason: banReason || (type.startsWith("un") ? "Снятие ограничения" : "Нарушение правил"),
          durationText: durationText || "Действие выполнено",
          createdAt: serverTimestamp(),
        });
      } catch (logErr) {
        console.warn("Could not write to moderation_logs:", logErr);
      }

      const actionsMap = {
        ban: "Бан успешно выдан",
        mute: "Мут успешно выдан",
        unban: "Разбан выдан",
        unmute: "Размут выдан",
      };
      addNotification(
        `${actionsMap[type]}: ${selectedUser.displayName}`,
        "success",
      );
    } catch (err) {
      console.error(err);
      addNotification("Ошибка при выполнении действия (проверьте права)", "error");
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

  const totalUsers = users.length;
  const bannedCount = users.filter((u) => u.isBanned).length;
  const mutedCount = users.filter((u) => u.isMuted).length;
  const onlineCount = users.filter((u) => isOnline(u.lastSeen)).length;

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
        className={`w-full max-w-5xl h-[88vh] overflow-hidden flex flex-col rounded-[3rem] shadow-2xl border ${profile?.theme === "light" ? "bg-white border-slate-200" : "bg-[#0f172a] border-white/10"}`}
      >
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-orange-500 p-3 rounded-2xl shadow-xl shadow-orange-500/20">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase">
                {t.adminTitle || "Админ Панель"}
              </h2>
              <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.4em]">
                Система управления & Модерация
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-7 h-7" />
          </button>
        </div>

        {/* Real-time Activity Statistics Counters Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 px-6 py-3 border-b border-white/5 bg-black/20 shrink-0">
          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5 flex flex-col">
            <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">
              Пользователи
            </span>
            <span className="text-lg font-black text-white tabular-nums">
              {totalUsers}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-green-500/10 border border-green-500/20 flex flex-col">
            <span className="text-[10px] uppercase font-black tracking-widest text-green-400">
              В сети
            </span>
            <span className="text-lg font-black text-green-300 tabular-nums">
              {onlineCount}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col">
            <span className="text-[10px] uppercase font-black tracking-widest text-rose-400">
              Активных банов
            </span>
            <span className="text-lg font-black text-rose-300 tabular-nums">
              {bannedCount}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col">
            <span className="text-[10px] uppercase font-black tracking-widest text-amber-400">
              Замучено
            </span>
            <span className="text-lg font-black text-amber-300 tabular-nums">
              {mutedCount}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-black tracking-widest text-blue-400">
              Всего чатов
            </span>
            <span className="text-lg font-black text-blue-300 tabular-nums">
              {chats.length}
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-white/5 px-6 pt-3 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab("moderation")}
            className={`py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === "moderation"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Управление & Быстрые пресеты
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              activeTab === "logs"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>Лог аудита модерации</span>
            <span className="bg-white/20 text-[10px] px-1.5 py-0.2 rounded-full">
              {moderationLogs.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              activeTab === "reports"
                ? "bg-orange-600 text-white shadow-lg shadow-orange-500/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>Жалобы</span>
            <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.2 rounded-full">
              {reports.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Moderation & Presets */}
        {activeTab === "moderation" && (
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2">
            {/* Left: Moderation Panel */}
            <div className="p-6 md:p-8 border-r border-white/5 overflow-y-auto custom-scrollbar space-y-6">
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
                    placeholder="ID, @handle или Имя"
                    className={`flex-1 rounded-xl px-4 text-sm outline-none focus:ring-1 ring-blue-500 ${profile?.theme === "light" ? "bg-white border border-slate-200 text-black" : "bg-black/20 border border-white/10 text-white"}`}
                  />
                  <button
                    onClick={searchUser}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
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
                        <p className="font-black text-xl italic tracking-tighter text-white">
                          {selectedUser.displayName}
                        </p>
                        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">
                          User ID: {selectedUser.id} · @{selectedUser.handle || "no_handle"}
                        </p>
                        {selectedUser.isBanned && (
                          <span className="inline-block mt-1 text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">
                            ЗАБЛОКИРОВАН
                          </span>
                        )}
                        {selectedUser.isMuted && (
                          <span className="inline-block mt-1 ml-1 text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full font-bold">
                            ЗАМУЧЕН
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <input
                        value={banReason}
                        onChange={(e) => setBanReason(e.target.value)}
                        placeholder="Причина (для бана / мута)"
                        className={`w-full rounded-2xl px-4 py-3 text-sm focus:ring-1 ring-blue-500 outline-none ${profile?.theme === "light" ? "bg-white border border-slate-200 text-black" : "bg-black/30 border border-white/5 text-white"}`}
                      />

                      {/* Quick Presets for Ban & Mute */}
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                          Быстрые пресеты наказания:
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => moderate("ban", 1, "1 час")}
                            className="py-2 rounded-xl bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 text-[10px] font-black uppercase tracking-wider transition-all"
                          >
                            Бан 1 час
                          </button>
                          <button
                            type="button"
                            onClick={() => moderate("ban", 24, "24 часа")}
                            className="py-2 rounded-xl bg-red-600/30 hover:bg-red-600/50 text-red-300 border border-red-500/40 text-[10px] font-black uppercase tracking-wider transition-all"
                          >
                            Бан 1 день
                          </button>
                          <button
                            type="button"
                            onClick={() => moderate("ban", 24 * 365 * 100, "Навсегда")}
                            className="py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-lg shadow-red-600/30"
                          >
                            Бан навсегда
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => moderate("mute", 1, "1 час")}
                            className="py-2 rounded-xl bg-orange-500/20 hover:bg-orange-500/40 text-orange-400 border border-orange-500/30 text-[10px] font-black uppercase tracking-wider transition-all"
                          >
                            Мут 1 час
                          </button>
                          <button
                            type="button"
                            onClick={() => moderate("mute", 24, "24 часа")}
                            className="py-2 rounded-xl bg-orange-500/30 hover:bg-orange-500/50 text-orange-300 border border-orange-500/40 text-[10px] font-black uppercase tracking-wider transition-all"
                          >
                            Мут 1 день
                          </button>
                          <button
                            type="button"
                            onClick={() => moderate("mute", 24 * 365 * 100, "Навсегда")}
                            className="py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-lg shadow-orange-600/30"
                          >
                            Мут навсегда
                          </button>
                        </div>
                      </div>

                      {/* Manual days & unban / unmute */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                        <button
                          onClick={() => moderate("unban")}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
                        >
                          Разбанить
                        </button>
                        <button
                          onClick={() => moderate("unmute")}
                          className="bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20"
                        >
                          Размутить
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: User Directory with Click-to-Moderate */}
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                Список пользователей ({users.length})
              </h3>
              <p className="text-xs text-slate-400">
                Нажмите на пользователя для моментальной настройки наказаний:
              </p>
              <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                {users.map((u, i) => (
                  <div
                    key={`adm-user-${u.uid || i}`}
                    onClick={() => setSelectedUser(u)}
                    className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border ${
                      selectedUser?.uid === u.uid
                        ? "bg-blue-600/20 border-blue-500/50"
                        : profile?.theme === "light"
                          ? "hover:bg-slate-200 border-slate-200"
                          : "hover:bg-white/5 border-white/5"
                    }`}
                  >
                    <img
                      src={u.photoURL}
                      className="w-10 h-10 rounded-xl object-cover shrink-0"
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
                      <p className="text-[10px] opacity-50 font-mono">
                        ID: {u.id} · {formatLastSeen(u.lastSeen)}
                      </p>
                    </div>
                    {u.isBanned && (
                      <span className="text-[9px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">
                        BANNED
                      </span>
                    )}
                    {u.isMuted && (
                      <span className="text-[9px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-bold">
                        MUTED
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Live Moderation Actions Log */}
        {activeTab === "logs" && (
          <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                Хронологический лог действий модерации
              </h3>
              <span className="text-xs text-slate-400">
                Записей: {moderationLogs.length}
              </span>
            </div>

            {moderationLogs.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center opacity-40">
                <ShieldCheck className="w-16 h-16 mb-2" />
                <p className="text-sm font-bold uppercase tracking-wider">
                  Логов пока нет. Действия администраторов будут фиксироваться здесь в реальном времени.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {moderationLogs.map((log) => {
                  const actionColor =
                    log.action === "ban"
                      ? "bg-red-500/20 text-red-400 border-red-500/30"
                      : log.action === "mute"
                        ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                        : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
                  return (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${actionColor}`}
                        >
                          {log.action}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-white">
                            Модератор <span className="text-blue-400">{log.adminName}</span> → Пользователь{" "}
                            <span className="text-amber-400">{log.targetUserName}</span>
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Причина: {log.reason} · Срок: {log.durationText || "—"}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">
                        {log.createdAt?.toDate ? format(log.createdAt.toDate(), "dd.MM.yyyy HH:mm") : "Недавно"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Reports */}
        {activeTab === "reports" && (
          <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
            <h3 className="text-xl font-black uppercase italic mb-6 text-orange-500 flex items-center gap-3">
              Жалобы от пользователей
              <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full text-[10px]">
                {reports.length}
              </span>
            </h3>

            {reports.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center opacity-40">
                <ShieldCheck className="w-16 h-16 mb-4" />
                <p className="text-sm font-black uppercase tracking-widest">
                  Все жалобы решены
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reports.map((r) => (
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
                        onClick={async () => {
                          try {
                            await deleteDoc(doc(db, "reports", r.id));
                            addNotification("Жалоба отмечена решенной", "success");
                          } catch (e) {
                            addNotification("Ошибка", "error");
                          }
                        }}
                        className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        Решено (Закрыть)
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await deleteDoc(doc(db, "reports", r.id));
                            addNotification("Удалено", "success");
                          } catch (e) {
                            addNotification("Ошибка удаления", "error");
                          }
                        }}
                        className="py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
