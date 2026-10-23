import React, { createContext, useContext, useEffect, useState } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  runTransaction,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "./lib/firebase";
import { UserProfile, Theme as ThemeType } from "./types";
import Landing from "./components/Landing";
import Auth from "./components/Auth";
import Messenger from "./components/Messenger";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, LogOut, Clock, AlertTriangle } from "lucide-react";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    if (user && profile) {
      const updatePresence = async () => {
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, { lastSeen: serverTimestamp() }, { merge: true });
      };

      updatePresence();
      const interval = setInterval(updatePresence, 60000);
      return () => clearInterval(interval);
    }
  }, [user, profile?.uid]);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        unsubProfile = onSnapshot(
          userRef,
          async (docSnap) => {
            if (docSnap.exists()) {
              setProfile(docSnap.data() as UserProfile);
              setLoading(false);
              setConnectionError(false);
            } else {
              try {
                if (
                  firebaseUser.providerData.some(
                    (p) => p.providerId === "google.com",
                  )
                ) {
                  const newProfile = await createInitialProfile(firebaseUser);
                  setProfile(newProfile);
                }
                setLoading(false);
                setConnectionError(false);
              } catch (e) {
                console.error("Profile creation failed", e);
                setLoading(false);
              }
            }
          },
          (error) => {
            console.error("Firestore Error:", error);
            if (
              error.message.includes("Could not reach Cloud Firestore backend")
            ) {
              setConnectionError(true);
            }
          },
        );
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const createInitialProfile = async (firebaseUser: User) => {
    const configRef = doc(db, "system", "config");
    const configSnap = await getDoc(configRef);
    let nextId: number;
    let availableIds: number[] = [];

    if (configSnap.exists()) {
      const data = configSnap.data();
      availableIds = data.availableIds || [];
      if (availableIds.length > 0) {
        nextId = availableIds.shift()!;
        await setDoc(configRef, { availableIds }, { merge: true });
      } else {
        nextId = (data.userSequence || 0) + 1;
        await setDoc(configRef, { userSequence: nextId }, { merge: true });
      }
    } else {
      nextId = 1;
      await setDoc(configRef, { userSequence: 1 }, { merge: true });
    }

    const handle =
      firebaseUser.email
        ?.split("@")[0]
        .replace(/[^a-zA-Z0-9_]/g, "")
        .toLowerCase() || `user_${nextId}`;
    const isCreator =
      firebaseUser.email === "iluha1032020@gmail.com" || nextId === 1;

    const profileData: UserProfile = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || "",
      displayName: firebaseUser.displayName || "User " + nextId,
      handle: handle,
      photoURL:
        firebaseUser.photoURL ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
      id: nextId,
      theme: "dark",
      role: isCreator ? "creator" : "user",
      isVerified: firebaseUser.providerData.some(
        (p) => p.providerId === "google.com",
      ),
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(db, "users", firebaseUser.uid), profileData);
    return profileData;
  };

  const signOut = async () => {
    await auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      <div
        className={
          profile?.theme === "dark" ? "dark-theme min-h-screen" : "min-h-screen"
        }
      >
        {connectionError && (
          <div className="fixed top-0 left-0 right-0 z-[200] bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] py-2 text-center shadow-xl animate-pulse">
            Firestore connection lost. Operating in offline mode. Please refresh
            or check Firebase setup.
          </div>
        )}
        <HashRouter>
          <AnimatePresence mode="wait">
            <Routes>
              <Route
                path="/"
                element={
                  loading ? (
                    <LoadingScreen />
                  ) : user ? (
                    <Navigate to="/chat" />
                  ) : (
                    <Landing />
                  )
                }
              />
              <Route
                path="/auth"
                element={
                  user && profile?.isVerified !== false ? (
                    <Navigate to="/chat" />
                  ) : (
                    <Auth />
                  )
                }
              />
              <Route
                path="/chat/*"
                element={
                  user ? (
                    profile?.isBanned ? (
                      <BannedScreen
                        reason={profile.banReason}
                        expires={profile.banExpires}
                      />
                    ) : profile?.isVerified === false ? (
                      <Navigate to="/auth" />
                    ) : (
                      <Messenger />
                    )
                  ) : (
                    <Navigate to="/" />
                  )
                }
              />
            </Routes>
          </AnimatePresence>
        </HashRouter>
      </div>
    </AuthContext.Provider>
  );
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-tg-bg">
      <motion.div
        animate={{ scale: [1, 1.2, 1], rotate: [0, 360] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="w-16 h-16 border-4 border-tg-blue border-t-transparent rounded-full"
      />
    </div>
  );
}

function BannedScreen({ reason, expires }: { reason?: string; expires?: any }) {
  const isPermanent = !expires || !expires.toDate;
  const dateStr = !isPermanent
    ? expires.toDate().toLocaleString("ru-RU", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Бессрочно (Навсегда)";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#070b12] text-white p-6 text-center relative overflow-hidden select-none">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-600/15 blur-[140px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-slate-900/80 border border-rose-500/30 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl relative z-10"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/20">
          <ShieldAlert className="w-10 h-10 text-rose-500" />
        </div>

        <h1 className="text-2xl font-black tracking-tight text-white mb-2">
          Доступ к аккаунту ограничен
        </h1>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Администрация мессенджера приостановила действие вашей учетной записи за нарушение правил сообщества.
        </p>

        <div className="space-y-3 mb-8 text-left">
          <div className="p-4 rounded-2xl bg-black/30 border border-white/5">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Причина блокировки</span>
            </div>
            <p className="text-sm font-medium text-slate-200">
              {reason || "Нарушение условий использования платформы"}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/30 border border-white/5">
            <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Срок действия ограничения</span>
            </div>
            <p className="text-sm font-medium text-slate-200">
              {dateStr}
            </p>
          </div>
        </div>

        <button
          onClick={() => auth.signOut()}
          className="w-full py-4 px-6 bg-rose-600/90 hover:bg-rose-500 text-white rounded-2xl font-bold text-sm tracking-wide transition-all shadow-xl shadow-rose-600/25 flex items-center justify-center gap-2.5 active:scale-98"
        >
          <LogOut className="w-4 h-4" />
          <span>Выйти из аккаунта</span>
        </button>
      </motion.div>
    </div>
  );
}
