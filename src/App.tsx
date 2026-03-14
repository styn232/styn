import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, 
  MessageCircle, 
  User, 
  Flame, 
  Search, 
  Bell, 
  PlusSquare, 
  Settings, 
  LogOut, 
  X, 
  Check, 
  Send, 
  Image as ImageIcon, 
  Video, 
  Mic, 
  MoreHorizontal,
  ThumbsUp,
  Share2,
  Trophy,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Zap,
  Star,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { io, Socket } from 'socket.io-client';

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const uploadFile = async (file: File, token: string) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  return await res.json();
};

// --- TYPES ---
type View = 'auth' | 'home' | 'dating' | 'chat' | 'reels' | 'profile' | 'admin' | 'market';

interface UserData {
  id: number;
  full_name: string;
  username: string;
  email: string;
  age: number;
  gender: string;
  interested_in: string;
  location: string;
  bio: string;
  photos: string; // JSON string
  cover_photo: string;
  relationship_status: string;
  verification_status: string;
  premium_type: string;
  points: number;
  level: number;
  followers_count: number;
  following_count: number;
  is_super_admin: number;
  token?: string;
}

// --- COMPONENTS ---

const Navbar = ({ activeView, setView, user }: { activeView: View, setView: (v: View) => void, user: UserData | null }) => {
  const navItems = [
    { id: 'home', icon: LayoutDashboard, label: 'Feed' },
    { id: 'dating', icon: Flame, label: 'Dating' },
    { id: 'reels', icon: PlayCircle, label: 'Reels' },
    { id: 'chat', icon: MessageCircle, label: 'Chat' },
    { id: 'market', icon: ShoppingBag, label: 'Market' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  if (user?.is_super_admin) {
    navItems.push({ id: 'admin', icon: ShieldCheck, label: 'Admin' });
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4">
      <nav className="max-w-6xl mx-auto glass rounded-[2rem] px-8 py-3 flex items-center justify-between shadow-2xl shadow-black/50 border border-white/10">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
          <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shadow-lg shadow-brand/20">
            <Zap className="text-white fill-white" size={24} />
          </div>
          <span className="text-2xl font-black tracking-tighter text-gradient hidden sm:block">STYN</span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as View)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-2xl transition-all relative group",
                activeView === item.id ? "bg-brand/10 text-brand" : "text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">{item.label}</span>
              {activeView === item.id && (
                <motion.div 
                  layoutId="nav-active"
                  className="absolute inset-0 border border-brand/50 rounded-2xl"
                />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all relative">
            <Bell size={18} className="text-white/60" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-brand rounded-full border-2 border-[#0A0A0A]" />
          </button>
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 cursor-pointer" onClick={() => setView('profile')}>
            <img 
              src={user?.photos ? JSON.parse(user.photos)[0] : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </nav>
    </div>
  );
};

const PlayCircle = ({ size, className }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
  </svg>
);

const ShoppingBag = ({ size, className }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);

// --- VIEWS ---

const AuthView = ({ onLogin }: { onLogin: (u: UserData) => void }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    new_password: '',
    username: '',
    full_name: '',
    gender: 'Male',
    interested_in: 'Female',
    age: 18
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let endpoint = '';
    if (mode === 'login') endpoint = '/api/auth/login';
    else if (mode === 'register') endpoint = '/api/auth/register';
    else endpoint = '/api/auth/reset-password';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    
    if (mode === 'reset') {
      if (data.success) {
        alert("Password reset successful! Please login.");
        setMode('login');
      } else {
        alert(data.error);
      }
      return;
    }

    if (data.token) {
      onLogin({ ...data.user, token: data.token });
    } else {
      alert(data.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand/10 via-transparent to-transparent">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass p-8 rounded-[2.5rem] shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-brand/20">
            <Zap className="text-white fill-white" size={32} />
          </div>
          <h1 className="text-4xl font-black tracking-tighter mb-2">STYN</h1>
          <p className="text-white/40 font-medium">Enterprise Dating & Social Network</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <input 
                type="text" 
                placeholder="Full Name" 
                className="input-glass w-full"
                value={formData.full_name}
                onChange={e => setFormData({...formData, full_name: e.target.value})}
              />
              <input 
                type="text" 
                placeholder="Username" 
                className="input-glass w-full"
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
              />
            </>
          )}
          <input 
            type="email" 
            placeholder="Email Address" 
            className="input-glass w-full"
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
          />
          {mode !== 'reset' && (
            <input 
              type="password" 
              placeholder="Password" 
              className="input-glass w-full"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          )}
          {mode === 'reset' && (
            <input 
              type="password" 
              placeholder="New Password" 
              className="input-glass w-full"
              value={formData.new_password}
              onChange={e => setFormData({...formData, new_password: e.target.value})}
            />
          )}
          {mode === 'register' && (
            <div className="grid grid-cols-2 gap-4">
              <select 
                className="input-glass w-full"
                value={formData.gender}
                onChange={e => setFormData({...formData, gender: e.target.value})}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <input 
                type="number" 
                placeholder="Age" 
                className="input-glass w-full"
                value={formData.age}
                onChange={e => setFormData({...formData, age: parseInt(e.target.value)})}
              />
            </div>
          )}
          
          <button type="submit" className="btn-primary w-full text-lg uppercase tracking-widest font-black">
            {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Reset Password'}
          </button>
        </form>

        <div className="mt-8 flex flex-col gap-2 text-center">
          {mode === 'login' && (
            <button 
              onClick={() => setMode('reset')}
              className="text-white/40 hover:text-white transition-all text-sm font-bold"
            >
              Forgot Password?
            </button>
          )}
          <button 
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-white/40 hover:text-white transition-all text-sm font-bold"
          >
            {mode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const FeedView = ({ user }: { user: UserData }) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState('');
  const [uploading, setUploading] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [postType, setPostType] = useState<'post' | 'reel'>('post');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/posts')
      .then(res => res.json())
      .then(setPosts);
  }, []);

  const handleCreatePost = async () => {
    if (!newPost.trim() && !mediaUrl) return;
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`
      },
      body: JSON.stringify({ content: newPost, media_url: mediaUrl, type: postType })
    });
    const post = await res.json();
    setPosts([post, ...posts]);
    setNewPost('');
    setMediaUrl('');
    setPostType('post');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const maxSize = isImage ? 2 * 1024 * 1024 : 5 * 1024 * 1024;

    if (file.size > maxSize) {
      alert(`File too large. Max size for ${isImage ? 'images' : 'videos'} is ${isImage ? '2MB' : '5MB'}`);
      return;
    }

    setUploading(true);
    try {
      const data = await uploadFile(file, user.token!);
      setMediaUrl(data.url);
    } catch (err) {
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pt-24 pb-32 px-4 space-y-6">
      {/* Create Post */}
      <div className="glass p-6 rounded-[2rem]">
        <div className="flex gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 shrink-0">
            <img 
              src={user.photos ? JSON.parse(user.photos)[0] : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} 
              alt="Me" 
              className="w-full h-full object-cover"
            />
          </div>
          <textarea 
            placeholder="What's on your mind? (Press Enter to post)" 
            className="w-full bg-transparent border-none focus:ring-0 resize-none text-lg"
            rows={2}
            value={newPost}
            onChange={e => setNewPost(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleCreatePost();
              }
            }}
          />
        </div>

        {mediaUrl && (
          <div className="relative mb-4 rounded-2xl overflow-hidden border border-white/10 aspect-video bg-black/20">
            {mediaUrl.endsWith('.mp4') ? (
              <video src={mediaUrl} className="w-full h-full object-cover" controls />
            ) : (
              <img src={mediaUrl} className="w-full h-full object-cover" alt="Preview" />
            )}
            <button 
              onClick={() => setMediaUrl('')}
              className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-black"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*,video/mp4" 
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all disabled:opacity-50"
            >
              <ImageIcon size={20} />
            </button>
            <select 
              className="bg-transparent text-white/40 text-[10px] font-black uppercase tracking-widest focus:outline-none cursor-pointer hover:text-white transition-all"
              value={postType}
              onChange={e => setPostType(e.target.value as 'post' | 'reel')}
            >
              <option value="post" className="bg-zinc-900">Post</option>
              <option value="reel" className="bg-zinc-900">Reel</option>
            </select>
          </div>
          <button 
            onClick={handleCreatePost}
            disabled={uploading || (!newPost.trim() && !mediaUrl)}
            className="bg-brand text-white px-6 py-2 rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Post'}
          </button>
        </div>
      </div>

      {/* Posts List */}
      <AnimatePresence>
        {posts.map((post, idx) => (
          <motion.div 
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="glass p-6 rounded-[2rem] space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${post.username}`} alt={post.username} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">@{post.username}</h3>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                    {new Date(post.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button className="text-white/40 hover:text-white">
                <MoreHorizontal size={20} />
              </button>
            </div>

            <p className="text-white/80 leading-relaxed">{post.content}</p>

            {post.media_url && (
              <div className="rounded-2xl overflow-hidden border border-white/5">
                <img src={post.media_url} alt="Post content" className="w-full object-cover max-h-96" />
              </div>
            )}

            <div className="flex items-center gap-6 pt-4 border-t border-white/5">
              <button className="flex items-center gap-2 text-white/40 hover:text-brand transition-all group">
                <div className="p-2 rounded-xl group-hover:bg-brand/10 transition-all">
                  <Heart size={20} />
                </div>
                <span className="text-xs font-bold">{post.likes_count}</span>
              </button>
              <button className="flex items-center gap-2 text-white/40 hover:text-blue-400 transition-all group">
                <div className="p-2 rounded-xl group-hover:bg-blue-400/10 transition-all">
                  <MessageCircle size={20} />
                </div>
                <span className="text-xs font-bold">Reply</span>
              </button>
              <button className="flex items-center gap-2 text-white/40 hover:text-green-400 transition-all group ml-auto">
                <div className="p-2 rounded-xl group-hover:bg-green-400/10 transition-all">
                  <Share2 size={20} />
                </div>
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const DatingView = ({ user }: { user: UserData }) => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetch('/api/users/discovery', {
      headers: { 'Authorization': `Bearer ${user.token}` }
    })
      .then(res => res.json())
      .then(setProfiles);
  }, []);

  const handleSwipe = async (type: 'left' | 'right' | 'super') => {
    const swipedUser = profiles[currentIndex];
    const res = await fetch('/api/swipe', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`
      },
      body: JSON.stringify({ swiped_id: swipedUser.id, type })
    });
    const data = await res.json();
    if (data.match) {
      alert("IT'S A MATCH! 🎉");
    }
    setCurrentIndex(currentIndex + 1);
  };

  if (currentIndex >= profiles.length) {
    return (
      <div className="h-screen flex items-center justify-center p-8 text-center">
        <div className="space-y-4">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
            <Search className="text-white/20" size={40} />
          </div>
          <h2 className="text-2xl font-black">No more profiles nearby</h2>
          <p className="text-white/40">Try expanding your filters or check back later!</p>
        </div>
      </div>
    );
  }

  const currentProfile = profiles[currentIndex];

  return (
    <div className="h-screen pt-24 pb-32 px-4 flex flex-col items-center justify-center overflow-hidden">
      <div className="relative w-full max-w-md aspect-[3/4] group">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentProfile.id}
            initial={{ scale: 0.9, opacity: 0, x: 50 }}
            animate={{ scale: 1, opacity: 1, x: 0 }}
            exit={{ scale: 0.9, opacity: 0, x: -50 }}
            className="absolute inset-0 rounded-[3rem] overflow-hidden shadow-2xl border border-white/10"
          >
            <img 
              src={currentProfile.photos ? JSON.parse(currentProfile.photos)[0] : `https://picsum.photos/seed/${currentProfile.username}/800/1200`} 
              alt={currentProfile.full_name} 
              className="w-full h-full object-cover"
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
            
            <div className="absolute bottom-0 left-0 right-0 p-8 space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-4xl font-black tracking-tighter">{currentProfile.full_name}, {currentProfile.age}</h2>
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <Check size={14} className="text-white" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-white/60 text-sm font-bold uppercase tracking-widest">
                <Zap size={14} className="text-brand fill-brand" />
                <span>87% Compatibility</span>
              </div>
              <p className="text-white/60 line-clamp-2 text-sm">{currentProfile.bio || 'No bio provided.'}</p>
              
              <div className="flex gap-2 pt-4">
                {['Travel', 'Music', 'Tech'].map(tag => (
                  <span key={tag} className="px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold uppercase tracking-widest">{tag}</span>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-6 mt-8">
        <button 
          onClick={() => handleSwipe('left')}
          className="w-16 h-16 rounded-full glass flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all hover:scale-110 active:scale-90"
        >
          <X size={32} />
        </button>
        <button 
          onClick={() => handleSwipe('super')}
          className="w-14 h-14 rounded-full glass flex items-center justify-center text-blue-400 hover:bg-blue-400/10 transition-all hover:scale-110 active:scale-90"
        >
          <Star size={24} fill="currentColor" />
        </button>
        <button 
          onClick={() => handleSwipe('right')}
          className="w-20 h-20 rounded-full bg-brand flex items-center justify-center text-white shadow-xl shadow-brand/30 hover:scale-110 active:scale-90 transition-all"
        >
          <Heart size={40} fill="currentColor" />
        </button>
      </div>
    </div>
  );
};

const ChatView = ({ user }: { user: UserData }) => {
  const [matches, setMatches] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    fetch('/api/matches', {
      headers: { 'Authorization': `Bearer ${user.token}` }
    })
      .then(res => res.json())
      .then(setMatches);

    socketRef.current = io();
    socketRef.current.emit("identify", user.id);

    socketRef.current.on("receive_message", (msg) => {
      if (activeChat && (msg.sender_id === activeChat.id || msg.receiver_id === activeChat.id)) {
        setMessages(prev => [...prev, msg]);
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [user.id, activeChat]);

  const sendMessage = () => {
    if (!newMessage.trim() || !activeChat) return;
    socketRef.current?.emit("send_message", {
      sender_id: user.id,
      receiver_id: activeChat.id,
      text: newMessage
    });
    setNewMessage('');
  };

  return (
    <div className="h-screen pt-24 pb-32 px-4 flex gap-6 max-w-6xl mx-auto">
      {/* Sidebar */}
      <div className="w-80 glass rounded-[2.5rem] overflow-hidden flex flex-col shrink-0">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-2xl font-black tracking-tighter mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
            <input 
              type="text" 
              placeholder="Search matches..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-2 text-sm focus:outline-none focus:border-brand/50"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {matches.map(match => (
            <button 
              key={match.id}
              onClick={() => setActiveChat(match)}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl transition-all",
                activeChat?.id === match.id ? "bg-brand/10 border border-brand/20" : "hover:bg-white/5"
              )}
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 relative">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${match.username}`} alt={match.username} />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0A0A0A]" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-sm">@{match.username}</h4>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Online Now</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 glass rounded-[2.5rem] overflow-hidden flex flex-col">
        {activeChat ? (
          <>
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activeChat.username}`} alt={activeChat.username} />
                </div>
                <div>
                  <h3 className="font-black tracking-tight">{activeChat.full_name}</h3>
                  <p className="text-[10px] text-brand font-bold uppercase tracking-widest">Typing...</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-3 rounded-xl hover:bg-white/5 text-white/40 transition-all"><Video size={20} /></button>
                <button className="p-3 rounded-xl hover:bg-white/5 text-white/40 transition-all"><Mic size={20} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.sender_id === user.id ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[70%] p-4 rounded-2xl text-sm",
                    msg.sender_id === user.id ? "bg-brand text-white rounded-tr-none" : "bg-white/10 text-white rounded-tl-none"
                  )}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-white/5">
              <div className="flex gap-4 items-center">
                <button className="text-white/20 hover:text-white transition-all"><PlusSquare size={24} /></button>
                <input 
                  type="text" 
                  placeholder="Type a message..." 
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-3 focus:outline-none focus:border-brand/50"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                />
                <button 
                  onClick={sendMessage}
                  className="w-12 h-12 bg-brand rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand/20 hover:scale-105 active:scale-95 transition-all"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mb-6">
              <MessageCircle className="text-white/10" size={48} />
            </div>
            <h2 className="text-3xl font-black tracking-tighter mb-2">Your Conversations</h2>
            <p className="text-white/40 max-w-xs">Select a match from the sidebar to start chatting and making connections.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const INTERESTS_LIST = [
  'Travel', 'Music', 'Tech', 'Food', 'Art', 'Fitness', 'Photography', 'Gaming', 
  'Movies', 'Reading', 'Dancing', 'Sports', 'Nature', 'Fashion', 'Coding', 'Business',
  'Politics', 'Science', 'History', 'Cooking', 'Yoga', 'Meditation', 'Pets', 'Cars'
];

const RELATIONSHIP_STATUSES = [
  'Single', 'In a relationship', 'Engaged', 'Married', 'Complicated', 'Divorced', 'Widowed'
];

const ProfileView = ({ user, onLogout, onUpdate }: { user: UserData, onLogout: () => void, onUpdate: () => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ ...user });
  const [activeTab, setActiveTab] = useState<'posts' | 'photos' | 'friends' | 'reels'>('posts');
  const [uploading, setUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    const res = await fetch('/api/profile/update', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`
      },
      body: JSON.stringify(editData)
    });
    if (res.ok) {
      setIsEditing(false);
      alert("Profile Saved!");
      onUpdate();
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = await uploadFile(file, user.token!);
      if (type === 'avatar') {
        const photos = JSON.parse(editData.photos || '[]');
        photos[0] = data.url;
        setEditData({ ...editData, photos: JSON.stringify(photos) });
      } else {
        setEditData({ ...editData, cover_photo: data.url });
      }
    } catch (err) {
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const getLevelColor = (level: number) => {
    if (level >= 50) return 'from-slate-300 to-slate-100 text-slate-900'; // Platinum
    if (level >= 20) return 'from-yellow-400 to-yellow-600 text-white'; // Gold
    return 'from-orange-700 to-orange-900 text-white'; // Bronze
  };

  const getLevelName = (level: number) => {
    if (level >= 50) return 'Platinum';
    if (level >= 20) return 'Gold';
    return 'Bronze';
  };

  return (
    <div className="max-w-5xl mx-auto pt-28 pb-32 px-4">
      <div className="glass rounded-[2rem] overflow-hidden shadow-2xl">
        {/* Cover Photo */}
        <div className="h-64 sm:h-80 bg-gradient-to-r from-brand/20 to-orange-500/20 relative group">
          <img 
            src={editData.cover_photo || "https://picsum.photos/seed/cover/1200/400"} 
            className="w-full h-full object-cover" 
            alt="Cover"
          />
          {isEditing && (
            <>
              <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={e => handlePhotoUpload(e, 'cover')} />
              <button 
                onClick={() => coverInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-4 right-4 bg-black/60 hover:bg-black/80 p-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <ImageIcon size={16} />
                {uploading ? 'Uploading...' : 'Change Cover'}
              </button>
            </>
          )}
        </div>
        
        {/* Profile Info Header */}
        <div className="px-6 sm:px-12 pb-8 relative">
          <div className="flex flex-col sm:flex-row items-end gap-6 -mt-16 sm:-mt-20 mb-6">
            <div className="relative group">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-[#0A0A0A] overflow-hidden bg-[#0A0A0A] shadow-2xl">
                <img 
                  src={editData.photos ? JSON.parse(editData.photos)[0] : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} 
                  alt="Profile" 
                  className="w-full h-full object-cover" 
                />
              </div>
              {isEditing && (
                <>
                  <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={e => handlePhotoUpload(e, 'avatar')} />
                  <button 
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute bottom-2 right-2 bg-brand p-2 rounded-full shadow-lg hover:scale-110 transition-all disabled:opacity-50"
                  >
                    <ImageIcon size={16} />
                  </button>
                </>
              )}
            </div>
            
            <div className="flex-1 pb-2 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-3 mb-1">
                <h1 className="text-3xl sm:text-4xl font-black tracking-tighter">{user.full_name}</h1>
                {user.verification_status === 'verified' && (
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Check size={14} className="text-white" />
                  </div>
                )}
              </div>
              <p className="text-white/40 font-bold uppercase tracking-[0.2em] text-xs mb-4">@{user.username}</p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-6">
                <div className="flex flex-col items-center sm:items-start">
                  <span className="text-xl font-black">{user.followers_count}</span>
                  <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Followers</span>
                </div>
                <div className="flex flex-col items-center sm:items-start">
                  <span className="text-xl font-black">{user.following_count}</span>
                  <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Following</span>
                </div>
                <div className="flex flex-col items-center sm:items-start">
                  <span className="text-xl font-black text-brand">{user.points}</span>
                  <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Points ($1 = 100pts)</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pb-2">
              {isEditing ? (
                <button 
                  onClick={handleSave}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-green-500/20 transition-all flex items-center gap-2"
                >
                  <Check size={16} />
                  Save Changes
                </button>
              ) : (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2"
                >
                  <Settings size={16} />
                  Edit Profile
                </button>
              )}
              <button onClick={onLogout} className="p-3 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 transition-all hover:text-white">
                <LogOut size={20} />
              </button>
            </div>
          </div>

          <div className="h-px bg-white/5 mb-8" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Intro */}
            <div className="space-y-6">
              <div className="glass p-6 rounded-3xl space-y-4">
                <h3 className="font-black uppercase tracking-widest text-xs text-white/40">Intro</h3>
                {isEditing ? (
                  <div className="space-y-4">
                    <textarea 
                      className="input-glass w-full text-sm" 
                      value={editData.bio} 
                      onChange={e => setEditData({...editData, bio: e.target.value})}
                      placeholder="Describe yourself..."
                    />
                    <select 
                      className="input-glass w-full text-sm"
                      value={editData.relationship_status}
                      onChange={e => setEditData({...editData, relationship_status: e.target.value})}
                    >
                      {RELATIONSHIP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                ) : (
                  <p className="text-sm text-white/80 leading-relaxed">{user.bio || "No bio yet."}</p>
                )}
                
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 text-sm text-white/60">
                    <Heart size={16} className="text-brand" />
                    <span>{user.relationship_status || "Single"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-white/60">
                    <Trophy size={16} className="text-brand" />
                    <div className={cn("px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-gradient-to-r", getLevelColor(user.level))}>
                      {getLevelName(user.level)} Level {user.level}
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass p-6 rounded-3xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black uppercase tracking-widest text-xs text-white/40">Interests</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS_LIST.map(interest => (
                    <button 
                      key={interest}
                      onClick={() => {
                        if (!isEditing) return;
                        const current = editData.interests?.split(',') || [];
                        const next = current.includes(interest) 
                          ? current.filter(i => i !== interest)
                          : [...current, interest];
                        setEditData({ ...editData, interests: next.join(',') });
                      }}
                      className={cn(
                        "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                        (editData.interests?.split(',') || []).includes(interest)
                          ? "bg-brand text-white"
                          : "bg-white/5 text-white/40 hover:bg-white/10"
                      )}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass p-6 rounded-3xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black uppercase tracking-widest text-xs text-white/40">Photos</h3>
                  <button className="text-brand text-[10px] font-black uppercase tracking-widest hover:underline">See All</button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden bg-white/5">
                      <img src={`https://picsum.photos/seed/user-photo-${i}/200`} className="w-full h-full object-cover" alt="" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Tabs & Content */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex gap-2 p-1 glass rounded-2xl">
                {(['posts', 'photos', 'friends', 'reels'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      activeTab === tab ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-white/40 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === 'posts' && (
                <div className="space-y-6">
                  <div className="glass p-6 rounded-3xl text-center py-12">
                    <p className="text-white/20 text-sm font-bold uppercase tracking-widest">No posts to show</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MarketView = ({ user }: { user: UserData }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', description: '', category: 'General', image_url: '' });

  useEffect(() => {
    fetch('/api/products').then(res => res.json()).then(setProducts);
  }, []);

  const handleAddProduct = async () => {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`
      },
      body: JSON.stringify(newProduct)
    });
    if (res.ok) {
      const p = await res.json();
      setProducts([p, ...products]);
      setShowAdd(false);
    }
  };

  const handleSaveProduct = async (id: number) => {
    const res = await fetch('/api/products/save', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`
      },
      body: JSON.stringify({ product_id: id })
    });
    if (res.ok) alert("Product Saved!");
    else alert("Already saved");
  };

  return (
    <div className="max-w-6xl mx-auto pt-28 pb-32 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2">Marketplace</h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Buy and sell within the community</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="btn-primary flex items-center gap-2"
        >
          <PlusSquare size={20} />
          Sell Product
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map(product => (
          <motion.div 
            key={product.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-3xl overflow-hidden group border border-white/5 hover:border-brand/30 transition-all"
          >
            <div className="aspect-square bg-white/5 relative">
              <img src={product.image_url || `https://picsum.photos/seed/${product.id}/400`} className="w-full h-full object-cover" alt="" />
              <div className="absolute top-4 right-4 bg-brand text-white px-3 py-1 rounded-xl text-sm font-black shadow-lg">
                ${product.price}
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-black text-lg mb-1">{product.name}</h3>
                <p className="text-xs text-white/40 font-bold uppercase tracking-widest">{product.category}</p>
              </div>
              <p className="text-sm text-white/60 line-clamp-2">{product.description}</p>
              <div className="flex gap-2 pt-2">
                <button className="flex-1 bg-white/5 hover:bg-white/10 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
                  View Details
                </button>
                <button 
                  onClick={() => handleSaveProduct(product.id)}
                  className="p-3 rounded-2xl bg-brand/10 text-brand hover:bg-brand hover:text-white transition-all"
                >
                  <Heart size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass w-full max-w-lg p-8 rounded-[2.5rem] space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black tracking-tighter">List New Product</h2>
                <button onClick={() => setShowAdd(false)} className="p-2 rounded-full hover:bg-white/5"><X size={24} /></button>
              </div>

              <div className="space-y-4">
                <input 
                  type="text" placeholder="Product Name" className="input-glass w-full" 
                  value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    type="number" placeholder="Price ($)" className="input-glass w-full" 
                    value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                  />
                  <select 
                    className="input-glass w-full"
                    value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                  >
                    <option>General</option>
                    <option>Electronics</option>
                    <option>Fashion</option>
                    <option>Home</option>
                  </select>
                </div>
                <textarea 
                  placeholder="Description" className="input-glass w-full h-32 resize-none" 
                  value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                />
                <input 
                  type="text" placeholder="Image URL (or upload)" className="input-glass w-full" 
                  value={newProduct.image_url} onChange={e => setNewProduct({...newProduct, image_url: e.target.value})}
                />
              </div>

              <button onClick={handleAddProduct} className="btn-primary w-full text-lg uppercase tracking-widest font-black">
                List Product
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ReelsView = ({ user, onFollowUpdate }: { user: UserData, onFollowUpdate: () => void }) => {
  const [reels, setReels] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetch('/api/posts?type=reel').then(res => res.json()).then(setReels);
  }, []);

  const handleFollow = async (id: number) => {
    const res = await fetch('/api/follow', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`
      },
      body: JSON.stringify({ following_id: id })
    });
    if (res.ok) {
      alert("Following!");
      onFollowUpdate();
    }
  };

  return (
    <div className="h-screen bg-black flex items-center justify-center">
      <div className="h-full max-h-[900px] aspect-[9/16] relative bg-zinc-900 rounded-[3rem] overflow-hidden shadow-2xl border border-white/5">
        {reels.length > 0 ? (
          <div className="h-full w-full relative">
            <video 
              src={reels[currentIndex].media_url} 
              className="w-full h-full object-cover"
              autoPlay loop muted
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            <div className="absolute bottom-8 left-8 right-20 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/20">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${reels[currentIndex].username}`} alt="" />
                </div>
                <h4 className="font-black text-sm">@{reels[currentIndex].username}</h4>
                <button 
                  onClick={() => handleFollow(reels[currentIndex].user_id)}
                  className="bg-brand text-white px-4 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest"
                >
                  Follow
                </button>
              </div>
              <p className="text-sm text-white/80 line-clamp-2">{reels[currentIndex].content}</p>
            </div>

            <div className="absolute bottom-8 right-4 flex flex-col gap-6">
              <button className="flex flex-col items-center gap-1 group">
                <div className="w-12 h-12 rounded-full glass flex items-center justify-center group-hover:bg-brand/20 transition-all">
                  <Heart size={24} />
                </div>
                <span className="text-[10px] font-black">{reels[currentIndex].likes_count}</span>
              </button>
              <button className="flex flex-col items-center gap-1 group">
                <div className="w-12 h-12 rounded-full glass flex items-center justify-center group-hover:bg-blue-400/20 transition-all">
                  <MessageCircle size={24} />
                </div>
                <span className="text-[10px] font-black">42</span>
              </button>
              <button className="flex flex-col items-center gap-1 group">
                <div className="w-12 h-12 rounded-full glass flex items-center justify-center group-hover:bg-green-400/20 transition-all">
                  <Share2 size={24} />
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-white/20">
            <PlayCircle size={64} />
          </div>
        )}
      </div>
      
      <div className="fixed right-12 top-1/2 -translate-y-1/2 flex flex-col gap-4">
        <button onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))} className="p-4 rounded-full glass hover:bg-white/10 transition-all"><ChevronLeft className="rotate-90" /></button>
        <button onClick={() => setCurrentIndex(prev => Math.min(reels.length - 1, prev + 1))} className="p-4 rounded-full glass hover:bg-white/10 transition-all"><ChevronRight className="rotate-90" /></button>
      </div>
    </div>
  );
};

const AdminView = ({ user }: { user: UserData }) => {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any>(null);

  const fetchStats = () => {
    fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${user.token}` } }).then(res => res.json()).then(setStats);
    fetch('/api/users', { headers: { 'Authorization': `Bearer ${user.token}` } }).then(res => res.json()).then(setUsers);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleUpdateUser = async () => {
    const res = await fetch(`/api/admin/users/${editingUser.id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`
      },
      body: JSON.stringify(editingUser)
    });
    if (res.ok) {
      alert("User updated!");
      setEditingUser(null);
      fetchStats();
    }
  };

  return (
    <div className="max-w-7xl mx-auto pt-28 pb-32 px-4 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black tracking-tighter">Admin Dashboard</h1>
        <div className="flex gap-4">
          <button className="btn-primary">Export Data</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Users', value: stats?.totalUsers, icon: User },
          { label: 'Total Posts', value: stats?.totalPosts, icon: LayoutDashboard },
          { label: 'Total Matches', value: stats?.totalMatches, icon: Heart },
          { label: 'Market Items', value: stats?.totalProducts, icon: ShoppingBag },
        ].map(stat => (
          <div key={stat.label} className="glass p-8 rounded-[2rem] flex items-center gap-6">
            <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center text-brand">
              <stat.icon size={32} />
            </div>
            <div>
              <p className="text-3xl font-black tracking-tighter">{stat.value || 0}</p>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {stats?.postStats && (
        <div className="glass p-8 rounded-[2rem]">
          <h2 className="text-xl font-black tracking-tighter mb-6">Post Distribution</h2>
          <div className="flex gap-8">
            {stats.postStats.map((s: any) => (
              <div key={s.type} className="flex flex-col">
                <span className="text-2xl font-black">{s.count}</span>
                <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{s.type}s</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass rounded-[2.5rem] overflow-hidden">
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-xl font-black tracking-tighter">User Management</h2>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
            <input type="text" placeholder="Search users..." className="bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-2 text-sm" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 border-b border-white/5">
                <th className="px-8 py-6">User</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6">Level/Points</th>
                <th className="px-8 py-6">Joined</th>
                <th className="px-8 py-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-white/5 transition-all">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} alt="" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{u.full_name}</p>
                        <p className="text-xs text-white/40">@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                      u.verification_status === 'verified' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-white/5 text-white/40 border-white/10"
                    )}>
                      {u.verification_status}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-bold">Lvl {u.level}</p>
                    <p className="text-xs text-white/40">{u.points} pts</p>
                  </td>
                  <td className="px-8 py-6 text-xs text-white/40">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-8 py-6">
                    <button 
                      onClick={() => setEditingUser(u)}
                      className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all"
                    >
                      <Settings size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass w-full max-w-lg p-8 rounded-[2.5rem] space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black tracking-tighter">Edit User: @{editingUser.username}</h2>
                <button onClick={() => setEditingUser(null)} className="p-2 rounded-full hover:bg-white/5"><X size={24} /></button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1 block">Verification</label>
                    <select 
                      className="input-glass w-full"
                      value={editingUser.verification_status}
                      onChange={e => setEditingUser({...editingUser, verification_status: e.target.value})}
                    >
                      <option value="pending">Pending</option>
                      <option value="verified">Verified (Blue Tick)</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1 block">Premium Type</label>
                    <select 
                      className="input-glass w-full"
                      value={editingUser.premium_type}
                      onChange={e => setEditingUser({...editingUser, premium_type: e.target.value})}
                    >
                      <option value="free">Free</option>
                      <option value="gold">Gold</option>
                      <option value="platinum">Platinum</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1 block">Points</label>
                    <input 
                      type="number" className="input-glass w-full"
                      value={editingUser.points}
                      onChange={e => setEditingUser({...editingUser, points: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1 block">Level</label>
                    <input 
                      type="number" className="input-glass w-full"
                      value={editingUser.level}
                      onChange={e => setEditingUser({...editingUser, level: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
              </div>

              <button onClick={handleUpdateUser} className="btn-primary w-full text-lg uppercase tracking-widest font-black">
                Save User Data
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- MAIN APP ---

export default function App() {
  const [view, setView] = useState<View>('auth');
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('styn_user');
    if (saved) {
      const u = JSON.parse(saved);
      setUser(u);
      setView('home');
    }
  }, []);

  const handleLogin = (u: UserData) => {
    setUser(u);
    localStorage.setItem('styn_user', JSON.stringify(u));
    setView('home');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('styn_user');
    setView('auth');
  };

  const fetchUser = async () => {
    if (!user) return;
    const res = await fetch('/api/me', {
      headers: { 'Authorization': `Bearer ${user.token}` }
    });
    if (res.ok) {
      const u = await res.json();
      const updatedUser = { ...user, ...u };
      setUser(updatedUser);
      localStorage.setItem('styn_user', JSON.stringify(updatedUser));
    }
  };

  if (view === 'auth') return <AuthView onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Navbar activeView={view} setView={setView} user={user} />
      
      <main className="container mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            {view === 'home' && user && <FeedView user={user} />}
            {view === 'dating' && user && <DatingView user={user} />}
            {view === 'chat' && user && <ChatView user={user} />}
            {view === 'profile' && user && <ProfileView user={user} onLogout={handleLogout} onUpdate={fetchUser} />}
            {view === 'market' && user && <MarketView user={user} />}
            {view === 'reels' && user && <ReelsView user={user} onFollowUpdate={fetchUser} />}
            {view === 'admin' && user && <AdminView user={user} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
