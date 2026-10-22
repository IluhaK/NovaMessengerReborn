export type Theme = 'light' | 'dark' | 'oled' | 'cyber' | 'sunset';

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

export interface Chat {
  id: string;
  type: 'direct' | 'group';
  name?: string; // For groups
  avatarURL?: string; // For groups
  creatorId?: string; // For groups
  memberIds: string[];
  lastMessage?: string;
  lastMessageAt?: any;
  createdAt: any;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: any;
  editedAt?: any;
  type: 'text' | 'system';
}

export interface SystemConfig {
  userSequence: number;
  availableIds: number[]; // For recycled IDs
}
