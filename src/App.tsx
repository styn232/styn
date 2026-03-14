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

// --- TYPES ---
type View = 'auth' | 'home' | 'dating' | 'chat' | 'reels' | 'profile' | 'admin';

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
  verification_status: string;
  premium_type: string;
  points: number;
  level: number;
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
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  if (user?.is_super_admin) {
    navItems.push({ id: 'admin', icon: ShieldCheck, label: 'Admin' });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:top-0 md:bottom-auto md:h-20 glass border-t md:border-t-0 md:border-b border-white/10 px-4 md:px-8 flex items-center justify-around md:justify-between">
      <div className="hidden md:flex items-center gap-2">
        <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shadow-lg shadow-brand/20">
          <Zap className="text-white fill-white" size={24} />
        </div>
        <span className="text-2xl font-black tracking-tighter text-gradient">STYN</span>
      </div>

      <div className="flex items-center gap-1 md:gap-8">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as View)}
            className={cn(
              "flex flex-col md:flex-row items-center gap-1 md:gap-2 p-3 rounded-2xl transition-all relative group",
              activeView === item.id ? "text-brand" : "text-white/40 hover:text-white"
            )}
          >
            <item.icon size={24} />
            <span className="text-[10px] md:text-sm font-bold uppercase tracking-widest hidden md:block">{item.label}</span>
            {activeView === item.id && (
              <motion.div 
                layoutId="nav-active"
                className="absolute -bottom-1 md:-bottom-4 left-0 right-0 h-1 bg-brand rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      <div className="hidden md:flex items-center gap-4">
        <button className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all relative">
          <Bell size={20} className="text-white/60" />
          <span className="absolute top-3 right-3 w-2 h-2 bg-brand rounded-full border-2 border-[#0A0A0A]" />
        </button>
        <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10">
          <img 
            src={user?.photos ? JSON.parse(user.photos)[0] : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} 
            alt="Profile" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </nav>
  );
};

const PlayCircle = ({ size, className }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
  </svg>
);

// --- VIEWS ---

const AuthView = ({ onLogin }: { onLogin: (u: UserData) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    full_name: '',
    gender: 'Male',
    interested_in: 'Female',
    age: 18
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await res.json();
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
          {!isLogin && (
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
          <input 
            type="password" 
            placeholder="Password" 
            className="input-glass w-full"
            value={formData.password}
            onChange={e => setFormData({...formData, password: e.target.value})}
          />
          {!isLogin && (
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
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-white/40 hover:text-white transition-all text-sm font-bold"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const FeedView = ({ user }: { user: UserData }) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState('');

  useEffect(() => {
    fetch('/api/posts')
      .then(res => res.json())
      .then(setPosts);
  }, []);

  const handleCreatePost = async () => {
    if (!newPost.trim()) return;
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`
      },
      body: JSON.stringify({ content: newPost })
    });
    const post = await res.json();
    setPosts([post, ...posts]);
    setNewPost('');
  };

  return (
    <div className="max-w-2xl mx-auto pt-24 pb-32 px-4 space-y-6">
      {/* Create Post */}
      <div className="glass p-6 rounded-[2rem]">
        <div className="flex gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 shrink-0">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt="Me" />
          </div>
          <textarea 
            placeholder="What's on your mind?" 
            className="w-full bg-transparent border-none focus:ring-0 resize-none text-lg"
            rows={2}
            value={newPost}
            onChange={e => setNewPost(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div className="flex gap-2">
            <button className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all">
              <ImageIcon size={20} />
            </button>
            <button className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all">
              <Video size={20} />
            </button>
          </div>
          <button 
            onClick={handleCreatePost}
            className="bg-brand text-white px-6 py-2 rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all"
          >
            Post
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

const ProfileView = ({ user, onLogout }: { user: UserData, onLogout: () => void }) => {
  return (
    <div className="max-w-4xl mx-auto pt-24 pb-32 px-4">
      <div className="glass rounded-[3rem] overflow-hidden">
        <div className="h-48 bg-gradient-to-r from-brand to-orange-500 relative">
          <div className="absolute -bottom-16 left-12 w-32 h-32 rounded-[2.5rem] border-8 border-[#0A0A0A] overflow-hidden bg-[#0A0A0A]">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt="Me" className="w-full h-full object-cover" />
          </div>
        </div>
        
        <div className="pt-20 px-12 pb-12">
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-black tracking-tighter">{user.full_name}</h1>
                <div className="px-3 py-1 rounded-full bg-brand/10 text-brand text-[10px] font-black uppercase tracking-widest border border-brand/20">
                  {user.premium_type} Member
                </div>
              </div>
              <p className="text-white/40 font-bold uppercase tracking-[0.3em] text-xs">@{user.username} • {user.age} Years Old</p>
            </div>
            <div className="flex gap-3">
              <button className="p-3 rounded-2xl glass hover:bg-white/10 transition-all"><Settings size={20} /></button>
              <button onClick={onLogout} className="p-3 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 transition-all hover:text-white"><LogOut size={20} /></button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-12">
            {[
              { label: 'Followers', value: '1.2K' },
              { label: 'Matches', value: '48' },
              { label: 'Points', value: user.points },
              { label: 'Level', value: user.level },
            ].map(stat => (
              <div key={stat.label} className="glass p-6 rounded-3xl text-center">
                <p className="text-2xl font-black tracking-tighter mb-1">{stat.value}</p>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-8">
            <section>
              <h3 className="text-xl font-black tracking-tighter uppercase mb-4 flex items-center gap-2">
                <User size={20} className="text-brand" />
                About Me
              </h3>
              <p className="text-white/60 leading-relaxed bg-white/5 p-6 rounded-3xl border border-white/5">
                {user.bio || "I'm new here! Looking for meaningful connections and great conversations."}
              </p>
            </section>

            <section>
              <h3 className="text-xl font-black tracking-tighter uppercase mb-4 flex items-center gap-2">
                <Trophy size={20} className="text-brand" />
                Interests
              </h3>
              <div className="flex flex-wrap gap-3">
                {['Photography', 'Travel', 'Music', 'Fitness', 'Coding'].map(tag => (
                  <span key={tag} className="px-6 py-2 rounded-2xl glass text-xs font-bold uppercase tracking-widest hover:border-brand/50 transition-all cursor-default">
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
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
            {view === 'profile' && user && <ProfileView user={user} onLogout={handleLogout} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
