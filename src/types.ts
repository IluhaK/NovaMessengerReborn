export type Theme = 'oled' | 'dark' | 'light' | 'emerald' | 'cyber' | 'sunset' | 'nordic' | 'telegram';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  bio?: string;
  id: number; // Numeric sequence ID
  theme: Theme;
  createdAt: any;
  isBanned?: boolean;
  banReason?: string;
  banExpires?: any;
  isMuted?: boolean;
  muteReason?: string;
  muteExpires?: any;
  isPlus?: boolean;
  language?: 'ru' | 'en';
  handle?: string;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  lastSeen?: any;
  role?: 'user' | 'admin' | 'creator';
  isVerified?: boolean;
  verificationCode?: string;
  fontSize?: 'small' | 'normal' | 'large';
  bubbleStyle?: 'modern' | 'rounded' | 'sharp';
  soundEnabled?: boolean;
}

export interface UserReport {
  id: string;
  reporterId: string;
  targetId: string;
  reason: string;
  chatId?: string;
  createdAt: any;
  status: 'pending' | 'resolved';
}

export interface ModerationLogEntry {
  id: string;
  adminId: string;
  adminName: string;
  targetUserId: string;
  targetUserName: string;
  action: 'ban' | 'unban' | 'mute' | 'unmute' | 'set_role' | 'verify';
  reason?: string;
  durationText?: string;
  createdAt: any;
}

export interface Chat {
  id: string;
  type: 'direct' | 'group' | 'saved';
  name?: string; // For groups
  avatarURL?: string; // For groups
  creatorId?: string; // For groups
  memberIds: string[];
  lastMessage?: string;
  lastMessageAt?: any;
  createdAt: any;
  pinnedMessageId?: string;
  pinnedMessage?: {
    id: string;
    text: string;
    senderName: string;
  };
  mutedBy?: string[];
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderNumericId?: number;
  senderRole?: string;
  isPlus?: boolean;
  text: string;
  createdAt: any;
  editedAt?: any;
  type: 'text' | 'system' | 'voice' | 'sticker' | 'file';
  reactions?: Record<string, string[]>; // { "❤️": ["uid1", "uid2"], "🔥": ["uid3"] }
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  pinned?: boolean;
  pinnedAt?: any;
  isForwarded?: boolean;
  forwardedFrom?: string;
  voiceDuration?: number; // seconds
  voiceWaveform?: number[]; // amplitude samples
  stickerUrl?: string;
  attachment?: {
    name: string;
    size: number;
    type: string;
    dataUrl?: string;
  };
}

export interface SystemConfig {
  userSequence: number;
  availableIds: number[]; // For recycled IDs
  globalChatLock?: boolean;
}
