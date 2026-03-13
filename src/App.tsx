/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home, 
  Heart, 
  Play, 
  MessageSquare, 
  Clapperboard, 
  User, 
  Bell, 
  PlusSquare, 
  Trophy, 
  Settings, 
  LogOut, 
  Search,
  MoreVertical,
  ThumbsUp,
  Share2,
  Send,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { io } from 'socket.io-client';
import { FilterMenu } from './components/FilterMenu';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type View = 'home' | 'dating' | 'reels' | 'chat' | 'blockbuster' | 'profile' | 'admin' | 'auth';

interface UserData {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email: string;
  avatar_url?: string;
  points: number;
  level: string;
  bio?: string;
  interests?: string;
  is_super_admin?: number;
  age?: number;
  gender?: string;
  location?: string;
  token?: string;
}

// --- Components ---

const Navbar = ({ currentView, setView, user, onLogout }: { currentView: View, setView: (v: View) => void, user: UserData | null, onLogout: () => void }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const menuItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'dating', icon: Heart, label: 'Social & Dating' },
    { id: 'reels', icon: Play, label: 'Reels' },
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'blockbuster', icon: Clapperboard, label: 'Blockbuster' },
  ];

  const handleNav = (id: View) => {
    setView(id);
    setIsMenuOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-b border-white/10 z-50 px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4 lg:gap-8">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black tracking-tighter text-white cursor-pointer leading-none" onClick={() => handleNav('home')}>STYN</h1>
            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-brand">unique experience</span>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-6">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNav(item.id as View)}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors",
                  currentView === item.id ? "text-brand" : "text-white/50 hover:text-white"
                )}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </div>

          {/* Mobile Horizontal Scroll Menu */}
          <div className="lg:hidden flex items-center gap-4 overflow-x-auto no-scrollbar max-w-[40vw] sm:max-w-[60vw]">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNav(item.id as View)}
                className={cn(
                  "flex-shrink-0 p-2 transition-colors",
                  currentView === item.id ? "text-brand" : "text-white/40"
                )}
              >
                <item.icon size={20} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2 md:gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] text-brand font-mono uppercase tracking-widest">{user.level}</p>
                <p className="text-[10px] text-white/40 font-bold">{user.points} PTS</p>
              </div>
              <button 
                onClick={() => handleNav('profile')}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-brand to-orange-600 border border-white/20 overflow-hidden flex items-center justify-center hover:scale-105 transition-all"
              >
                {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={18} className="text-white" />}
              </button>
              
              {/* Desktop Logout */}
              <button 
                onClick={onLogout}
                className="hidden lg:flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 hover:text-red-400 transition-all"
              >
                <LogOut size={14} />
                Logout
              </button>

              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-2 text-white/70 hover:text-white"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleNav('auth')}
                className="bg-brand text-black px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all"
              >
                Login
              </button>
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-2 text-white/70 hover:text-white"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-black z-40 lg:hidden flex flex-col pt-24 px-6"
          >
            <div className="space-y-4">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id as View)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-2xl text-xl font-black tracking-tight transition-all",
                    currentView === item.id ? "bg-brand text-black" : "text-white/50 hover:bg-white/5"
                  )}
                >
                  <item.icon size={24} />
                  {item.label}
                </button>
              ))}
              <div className="pt-8 border-t border-white/10 mt-8">
                {user ? (
                  <button 
                    onClick={onLogout}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-400 font-bold hover:bg-red-400/10 transition-all"
                  >
                    <LogOut size={24} />
                    Logout
                  </button>
                ) : (
                  <button 
                    onClick={() => handleNav('auth')}
                    className="w-full bg-brand text-black p-4 rounded-2xl font-black uppercase tracking-widest"
                  >
                    Login / Sign Up
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-lg border-t border-white/10 h-16 px-6 flex items-center justify-between z-50">
        {menuItems.slice(0, 4).map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as View)}
            className={cn(
              "p-2 transition-all",
              currentView === item.id ? "text-brand scale-110" : "text-white/40"
            )}
          >
            <item.icon size={24} />
          </button>
        ))}
        <button
          onClick={() => setView('profile')}
          className={cn(
            "p-2 transition-all",
            currentView === 'profile' ? "text-brand scale-110" : "text-white/40"
          )}
        >
          <User size={24} />
        </button>
      </div>
    </>
  );
};

// --- Main App ---

export default function App() {
  const [isLaunched, setIsLaunched] = useState(false);
  const [view, setView] = useState<View>('home');
  const [user, setUser] = useState<UserData | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock initial user for demo
  useEffect(() => {
    const savedUser = localStorage.getItem('styn_user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('styn_user');
    setView('home');
  };

  const renderContent = () => {
    switch (view) {
      case 'home':
        return <HomeView setView={setView} user={user} />;
      case 'dating':
        return <DatingView user={user} setView={setView} />;
      case 'reels':
        return <ReelsView user={user} />;
      case 'chat':
        return <ChatView user={user} />;
      case 'blockbuster':
        return <BlockbusterView />;
      case 'admin':
        return <AdminView setView={setView} user={user} />;
      case 'profile':
        return <ProfileView user={user} onUpdateUser={setUser} />;
      case 'auth':
        return <AuthView onLogin={(u) => { setUser(u); setView('home'); localStorage.setItem('styn_user', JSON.stringify(u)); }} />;
      default:
        return <HomeView setView={setView} user={user} />;
    }
  };

  if (!isLaunched) {
    return <Launcher onLaunch={() => setIsLaunched(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-brand/30">
      <Navbar currentView={view} setView={setView} user={user} onLogout={handleLogout} />
      <main className="pt-16 pb-20 lg:pb-0 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
      
      {/* Admin Quick Access (Demo Only) */}
      {user?.is_super_admin === 1 && (
        <button 
          onClick={() => setView('admin')}
          className="fixed bottom-20 lg:bottom-4 right-4 bg-brand text-black px-4 py-2 rounded-full flex items-center justify-center gap-2 hover:scale-105 transition-all z-50 font-black text-[10px] uppercase tracking-widest shadow-xl"
        >
          <Settings size={14} />
          Admin Panel
        </button>
      )}
    </div>
  );
}

// --- Launcher & Splash ---

const Launcher = ({ onLaunch }: { onLaunch: () => void }) => {
  return (
    <div className="fixed inset-0 bg-[#050505] flex flex-col items-center justify-center z-[100] overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-600/10 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="w-24 h-24 bg-brand rounded-[2rem] flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(235,150,110,0.3)]">
          <h1 className="text-5xl font-black text-black tracking-tighter">S</h1>
        </div>
        <h2 className="text-6xl font-black tracking-tighter text-white mb-2">STYN</h2>
        <p className="text-brand font-mono text-[10px] uppercase tracking-[0.4em] mb-12">unique experience</p>
        
        <button 
          onClick={onLaunch}
          className="group relative px-12 py-4 bg-white text-black rounded-full font-black uppercase tracking-widest overflow-hidden transition-all hover:scale-105 active:scale-95"
        >
          <span className="relative z-10">Launch Platform</span>
          <div className="absolute inset-0 bg-brand translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        </button>
      </motion.div>

      <div className="absolute bottom-12 text-white/20 text-[10px] font-bold uppercase tracking-[0.2em]">
        Version 1.0.4 • Powered by STYN Engine
      </div>
    </div>
  );
};

const AdBanner = () => {
  const [ad, setAd] = useState<any>(null);

  useEffect(() => {
    fetch('/api/ads')
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) setAd(data[0]);
      });
  }, []);

  if (!ad) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-3xl p-4 flex items-center gap-4 group cursor-pointer overflow-hidden relative"
      onClick={() => window.open(ad.link_url, '_blank')}
    >
      <div className="absolute top-2 right-2 bg-black/50 text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full text-white/40">Ad</div>
      <div className="w-16 h-16 rounded-2xl bg-white/10 overflow-hidden flex-shrink-0">
        <img src={ad.image_url || 'https://picsum.photos/seed/ad/200/200'} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold truncate group-hover:text-brand transition-colors">{ad.title}</h4>
        <p className="text-xs text-white/40 line-clamp-2">{ad.content}</p>
      </div>
    </motion.div>
  );
};

// --- Sub-Views ---

const AdminView = ({ setView, user }: { setView: (v: View) => void, user: UserData | null }) => {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'users'>('stats');

  useEffect(() => {
    if (!user?.token) return;
    
    const fetchStats = async () => {
      const res = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await res.json();
      setStats(data);
    };

    const fetchUsers = async () => {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await res.json();
      setUsers(data);
    };

    fetchStats();
    fetchUsers();
  }, [user]);

  if (!stats) return <div className="p-12 text-center animate-pulse">Loading Admin Panel...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <button 
            onClick={() => setView('home')}
            className="flex items-center gap-2 text-brand font-black uppercase tracking-widest text-[10px] mb-4 hover:translate-x-[-4px] transition-transform"
          >
            <ChevronLeft size={14} />
            Back to Feed
          </button>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter">ADMIN PANEL</h2>
          <p className="text-white/40 text-sm">Platform oversight and management dashboard.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-center">
            <p className="text-2xl font-black">{stats.totalUsers}</p>
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Total Users</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-center">
            <p className="text-2xl font-black">{stats.totalPosts + stats.totalReels}</p>
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Total Content</p>
          </div>
        </div>
      </header>

      <div className="flex gap-4 mb-8 overflow-x-auto no-scrollbar pb-2">
        {['stats', 'users'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={cn(
              "px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all",
              activeTab === tab ? "bg-brand text-black border-brand" : "bg-white/5 text-white/40 border-white/10"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 space-y-8">
          {activeTab === 'stats' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8">
                <h3 className="text-lg font-bold mb-4">User Growth</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/40">New Users Today</span>
                    <span className="text-xl font-black text-emerald-400">+{stats.newUsersToday}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/40">Active Users</span>
                    <span className="text-xl font-black text-brand">{stats.activeUsers}</span>
                  </div>
                  <button 
                    onClick={async () => {
                      if (confirm('Are you sure you want to remove follows from users without full names?')) {
                        const res = await fetch('/api/admin/cleanup-followers', {
                          method: 'POST',
                          headers: { 'Authorization': `Bearer ${user?.token}` }
                        });
                        const data = await res.json();
                        alert(`Successfully removed ${data.removedCount} fake follows.`);
                      }
                    }}
                    className="w-full py-2 mt-4 rounded-xl bg-red-500/20 text-red-400 border border-red-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                  >
                    Cleanup Fake Followers
                  </button>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8">
                <h3 className="text-lg font-bold mb-4">Content Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/40">Posts</span>
                    <span className="text-xl font-black">{stats.totalPosts}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/40">Reels</span>
                    <span className="text-xl font-black">{stats.totalReels}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 md:col-span-2">
                <h3 className="text-lg font-bold mb-4">Top Users by Points</h3>
                <div className="space-y-3">
                  {stats.topUsers.map((u: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                      <span className="text-sm font-bold">@{u.username}</span>
                      <span className="text-xs font-mono text-brand">{u.points} PTS</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
              <h3 className="text-xl font-bold mb-6">User Management</h3>
              <div className="space-y-4">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden">
                        {u.avatar_url && <img src={u.avatar_url} className="w-full h-full object-cover" />}
                      </div>
                      <div>
                        <p className="font-bold text-sm">@{u.username}</p>
                        <p className="text-[10px] text-white/40">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {u.is_banned ? (
                        <button className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase">Unban</button>
                      ) : (
                        <button className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-bold uppercase">Ban</button>
                      )}
                      <button className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-[10px] font-bold uppercase">Edit</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-8">
          <div className="bg-brand text-black rounded-[2rem] p-8">
            <h3 className="text-xl font-black tracking-tighter mb-2">QUICK ACTIONS</h3>
            <p className="text-black/60 text-xs mb-6">Common administrative tasks.</p>
            <div className="space-y-3">
              <button className="w-full py-3 rounded-xl bg-black text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">Send Announcement</button>
              <button className="w-full py-3 rounded-xl bg-black/10 text-black border border-black/10 text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all">Export User Data</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

const HomeView = ({ setView, user }: { setView: (v: View) => void, user: UserData | null }) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchData = async () => {
    try {
      const [postsRes, newsRes] = await Promise.all([
        fetch('/api/posts'),
        fetch('/api/news')
      ]);
      const postsData = await postsRes.json();
      const newsData = await newsRes.json();
      setPosts(postsData);
      setNews(newsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.username, user?.avatar_url]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMedia(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!user || (!content && !media)) return alert('Please add content or media');
    setUploading(true);
    try {
      await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          content,
          media_url: media,
          type: 'post'
        })
      });
      setShowUpload(false);
      setContent('');
      setMedia(null);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleLike = async (postId: number) => {
    if (!user) return alert('Please login to like posts');
    const res = await fetch('/api/posts/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, post_id: postId })
    });
    const data = await res.json();
    setPosts(posts.map(p => {
      if (p.id === postId) {
        return { ...p, likes_count: data.liked ? p.likes_count + 1 : p.likes_count - 1 };
      }
      return p;
    }));
  };

  const handleComment = async (postId: number, content: string) => {
    if (!user) return alert('Please login to comment');
    if (!content.trim()) return;
    const res = await fetch('/api/posts/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, post_id: postId, content })
    });
    const newComment = await res.json();
    setPosts(posts.map(p => {
      if (p.id === postId) {
        return { ...p, comments: [...(p.comments || []), newComment] };
      }
      return p;
    }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Feed */}
        <div className="lg:col-span-8 space-y-6 md:space-y-8">
          <AdBanner />
          
          {user && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <div className="flex gap-4 items-center">
                <img src={user.avatar_url || 'https://picsum.photos/seed/user/100/100'} alt="" className="w-12 h-12 rounded-full object-cover border border-white/10" />
                <button 
                  onClick={() => setShowUpload(true)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-left text-white/40 hover:bg-white/10 transition-all text-sm"
                >
                  What's on your mind, {user.first_name || user.username}?
                </button>
              </div>
            </div>
          )}

          {showUpload && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-zinc-900 border border-white/10 rounded-[2.5rem] w-full max-w-xl p-8 relative"
              >
                <button 
                  onClick={() => setShowUpload(false)}
                  className="absolute top-6 right-6 text-white/40 hover:text-white"
                >
                  <X size={24} />
                </button>
                <h3 className="text-2xl font-black tracking-tighter mb-6 uppercase">Create Post</h3>
                
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Share something unique..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-sm focus:outline-none focus:border-brand h-32 mb-6"
                />

                <div className="mb-6">
                  <input 
                    type="file" 
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="hidden" 
                    id="post-media" 
                  />
                  <label 
                    htmlFor="post-media"
                    className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl p-8 cursor-pointer hover:border-brand transition-colors"
                  >
                    {media ? (
                      media.startsWith('data:video') ? (
                        <video src={media} className="max-h-48 rounded-xl" controls />
                      ) : (
                        <img src={media} alt="Preview" className="max-h-48 rounded-xl" />
                      )
                    ) : (
                      <>
                        <PlusSquare size={32} className="text-white/20 mb-2" />
                        <p className="text-xs font-bold uppercase tracking-widest text-white/40">Add Photo or Video</p>
                      </>
                    )}
                  </label>
                </div>

                <button 
                  onClick={handleUpload}
                  disabled={uploading || (!content && !media)}
                  className="w-full bg-brand text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Post Now'}
                </button>
              </motion.div>
            </div>
          )}
          
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          ) : posts.map(post => (
            <div key={post.id} className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden group transition-all hover:border-white/20">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={post.avatar_url || 'https://picsum.photos/seed/user/100/100'} alt="" className="w-10 h-10 rounded-full object-cover border border-white/10" />
                  <div>
                    <p className="font-bold text-sm">@{post.username}</p>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
                      {new Date(post.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button className="text-white/20 hover:text-white"><Settings size={18} /></button>
              </div>
              
              <div className="px-4 pb-4">
                <p className="text-sm mb-4 leading-relaxed">{post.content}</p>
                {post.media_url && (
                  <div className="rounded-2xl overflow-hidden bg-black/20 border border-white/5 aspect-video mb-4">
                    <img 
                      src={post.media_url} 
                      alt="" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                
                <div className="flex items-center gap-6 pt-2 border-t border-white/5">
                  <button 
                    onClick={() => handleLike(post.id)}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-brand transition-colors"
                  >
                    <Heart size={18} className={post.liked ? "fill-brand text-brand" : ""} />
                    {post.likes_count || 0}
                  </button>
                  <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-emerald-400 transition-colors">
                    <MessageSquare size={18} />
                    {post.comments?.length || 0}
                  </button>
                  <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-indigo-400 transition-colors">
                    <Share2 size={18} />
                    Share
                  </button>
                </div>

                {/* Comments Section */}
                <div className="mt-4 space-y-3">
                  {post.comments?.map((comment: any) => (
                    <div key={comment.id} className="flex gap-3 items-start bg-white/5 p-3 rounded-2xl">
                      <img src={comment.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                      <div>
                        <p className="text-[10px] font-bold text-brand">@{comment.username}</p>
                        <p className="text-xs text-white/80">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                  {user && (
                    <div className="flex gap-2 mt-4">
                      <input 
                        type="text" 
                        placeholder="Write a comment..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-white/30"
                        onKeyPress={(e: any) => {
                          if (e.key === 'Enter') {
                            handleComment(post.id, e.target.value);
                            e.target.value = '';
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          {/* Latest News Section */}
          <section className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
            <h3 className="text-xl font-black tracking-tighter mb-6 flex items-center gap-2">
              <Play size={20} className="text-brand fill-brand" />
              LATEST NEWS
            </h3>
            <div className="space-y-6">
              {news.map(item => (
                <div key={item.id} className="group cursor-pointer">
                  <div className="aspect-video rounded-2xl overflow-hidden mb-3 border border-white/10">
                    <img src={item.image_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-brand mb-1 block">{item.location} • {item.source}</span>
                  <h4 className="text-sm font-bold leading-tight group-hover:text-brand transition-colors">{item.title}</h4>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
            <h3 className="text-xl font-black tracking-tighter mb-6">SUGGESTED FRIENDS</h3>
            <div className="space-y-6">
              {posts.slice(0, 4).map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={p.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-white/10" />
                    <div>
                      <p className="text-sm font-bold">@{p.username}</p>
                      <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Suggested for you</p>
                    </div>
                  </div>
                  <button className="text-[10px] font-black uppercase tracking-widest text-brand hover:text-white transition-colors">Follow</button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const DatingView = ({ user, setView }: { user: UserData | null, setView: (v: View) => void }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetch(`/api/dating/suggestions?user_id=${user.id}`)
        .then(res => res.json())
        .then(data => {
          setProfiles(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [user]);

  const handleSwipe = async (status: 'matched' | 'rejected') => {
    if (!user || profiles.length === 0) return;
    
    const targetUser = profiles[currentIndex % profiles.length];
    
    try {
      const res = await fetch('/api/dating/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user1_id: user.id,
          user2_id: targetUser.id,
          status
        })
      });
      const data = await res.json();
      if (data.match) {
        alert(`It's a Match with ${targetUser.username}!`);
      }
      setCurrentIndex(c => c + 1);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFollow = async (targetId: number) => {
    if (!user) return;
    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          follower_id: user.id,
          following_id: targetId
        })
      });
      const data = await res.json();
      setProfiles(prev => prev.map(p => p.id === targetId ? { ...p, isFollowing: data.followed } : p));
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
    <Heart size={64} className="text-white/10 mb-6" />
    <h2 className="text-3xl font-black tracking-tighter mb-2">FIND YOUR MATCH</h2>
    <p className="text-white/50 max-w-xs mb-8">Join STYN Social & Dating to connect with people who share your interests.</p>
    <button 
      onClick={() => setView('auth')}
      className="bg-white text-black px-8 py-3 rounded-full font-bold hover:scale-105 transition-all"
    >
      Get Started
    </button>
  </div>;

  if (loading) return <div className="flex items-center justify-center h-[80vh]">Calculating compatibility...</div>;
  if (profiles.length === 0) return <div className="flex items-center justify-center h-[80vh]">No more suggestions for now.</div>;

  const currentProfile = profiles[currentIndex % profiles.length];

  return (
    <div className="max-w-md mx-auto px-4 py-8 h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentProfile.id}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0, x: 200 }}
            className="absolute inset-0 bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
          >
            <img 
              src={currentProfile.avatar_url || `https://picsum.photos/seed/dating${currentProfile.id}/800/1200`} 
              alt="" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
            
            {/* Compatibility Badge */}
            <div className="absolute top-6 right-6 bg-brand text-black px-4 py-1 rounded-full text-xs font-black tracking-widest shadow-lg">
              {currentProfile.matchScore}% COMPATIBLE
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-8">
              <div className="flex items-end gap-3 mb-2">
                <h3 className="text-4xl font-black tracking-tighter">{currentProfile.username}</h3>
                <span className="text-2xl font-medium text-white/70 mb-1">24</span>
              </div>
              <p className="text-white/70 text-sm mb-6">{currentProfile.bio || 'No bio provided.'}</p>
              <div className="flex flex-wrap gap-2">
                {(currentProfile.interests || '').split(',').map((tag: string) => (
                  <span key={tag} className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                    currentProfile.sharedInterests?.includes(tag.trim().toLowerCase()) 
                      ? "bg-brand text-black" 
                      : "bg-white/10 text-white"
                  )}>
                    {tag.trim()}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      
      <div className="flex justify-center gap-6 py-8">
        <button 
          onClick={() => handleSwipe('rejected')}
          className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-all"
        >
          <LogOut size={24} className="rotate-180" />
        </button>
        <button 
          onClick={() => handleSwipe('matched')}
          className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-all shadow-xl"
        >
          <Heart size={32} fill="currentColor" />
        </button>
        <button 
          onClick={() => handleFollow(currentProfile.id)}
          className={cn(
            "w-16 h-16 rounded-full border flex items-center justify-center transition-all",
            currentProfile.isFollowing 
              ? "bg-brand border-brand text-black" 
              : "border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
          )}
        >
          <UserPlus size={24} />
        </button>
        <button 
          onClick={() => setCurrentIndex(c => c + 1)}
          className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-all"
        >
          <PlusSquare size={24} />
        </button>
      </div>
    </div>
  );
};

const ReelsView = ({ user }: { user: UserData | null }) => {
  const [showUpload, setShowUpload] = useState(false);
  const [reelContent, setReelContent] = useState('');
  const [reelMedia, setReelMedia] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reels, setReels] = useState<any[]>([]);
  const [currentReelIndex, setCurrentReelIndex] = useState(0);

  const fetchReels = async () => {
    const res = await fetch('/api/posts?type=reel');
    const data = await res.json();
    setReels(data);
  };

  useEffect(() => {
    fetchReels();
  }, [user?.username, user?.avatar_url]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReelMedia(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!user || !reelMedia) return alert('Please select a file first');
    setUploading(true);
    try {
      await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          content: reelContent,
          media_url: reelMedia,
          type: 'reel'
        })
      });
      setShowUpload(false);
      setReelContent('');
      setReelMedia(null);
      
      const res = await fetch('/api/posts?type=reel');
      const data = await res.json();
      setReels(data);
      alert('Reel uploaded successfully!');
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const currentReel = reels[currentReelIndex % reels.length];

  return (
    <div className="h-[calc(100vh-4rem)] bg-black flex items-center justify-center relative overflow-hidden">
      {user && (
        <button 
          onClick={() => setShowUpload(true)}
          className="absolute top-4 md:top-8 right-4 md:right-8 z-30 bg-brand text-black px-4 md:px-6 py-2 rounded-full font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg text-[10px] md:text-xs"
        >
          Upload Reel
        </button>
      )}

      {showUpload && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[60] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-[2.5rem] p-6 md:p-8 w-full max-w-md">
            <h3 className="text-2xl font-black tracking-tighter mb-6">UPLOAD REEL</h3>
            <div className="space-y-4">
              <textarea 
                placeholder="What's this reel about?" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-brand h-32"
                value={reelContent}
                onChange={e => setReelContent(e.target.value)}
              />
              
              <div className="relative">
                <input 
                  type="file" 
                  accept="video/*,image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="reel-upload"
                />
                <label 
                  htmlFor="reel-upload"
                  className="w-full bg-white/5 border border-dashed border-white/20 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-brand transition-all"
                >
                  {uploading ? (
                    <span className="text-xs font-bold animate-pulse">Processing...</span>
                  ) : reelMedia ? (
                    <div className="text-center">
                      <span className="text-emerald-400 text-xs font-bold block mb-2">File Ready</span>
                      <span className="text-[10px] text-white/40 truncate max-w-[200px] block">Media loaded successfully</span>
                    </div>
                  ) : (
                    <>
                      <PlusSquare size={32} className="text-white/20 mb-2" />
                      <span className="text-xs font-bold text-white/40">Select Video or Photo</span>
                    </>
                  )}
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setShowUpload(false)}
                  className="flex-1 px-6 py-3 rounded-2xl border border-white/10 font-bold uppercase tracking-widest text-xs"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpload}
                  disabled={uploading || !reelMedia}
                  className="flex-1 px-6 py-3 rounded-2xl bg-brand text-black font-black uppercase tracking-widest text-xs disabled:opacity-50"
                >
                  Post Reel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reels.length > 0 ? (
        <div className="h-full w-full max-w-[500px] aspect-[9/16] bg-zinc-900 relative group overflow-hidden shadow-2xl">
          {currentReel.media_url.includes('video') || currentReel.media_url.endsWith('.mp4') ? (
            <video 
              src={currentReel.media_url} 
              className="w-full h-full object-cover"
              autoPlay 
              loop 
              muted 
              playsInline
            />
          ) : (
            <img 
              src={currentReel.media_url} 
              alt="" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" onClick={() => setCurrentReelIndex(c => c + 1)} />
          
          {/* Interaction Sidebar */}
          <div className="absolute right-4 bottom-24 flex flex-col gap-6 items-center z-10">
            <div className="flex flex-col items-center gap-1">
              <button className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all">
                <Heart size={20} className="md:w-6 md:h-6" />
              </button>
              <span className="text-[10px] font-bold">{currentReel.likes_count || 0}</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <button className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all">
                <MessageSquare size={20} className="md:w-6 md:h-6" />
              </button>
              <span className="text-[10px] font-bold">1.2k</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <button className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all">
                <Share2 size={20} className="md:w-6 md:h-6" />
              </button>
              <span className="text-[10px] font-bold">Share</span>
            </div>
          </div>

          {/* Navigation Arrows (Desktop) */}
          <button 
            onClick={(e) => { e.stopPropagation(); setCurrentReelIndex(c => (c > 0 ? c - 1 : reels.length - 1)); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md hidden md:flex items-center justify-center hover:bg-black/40 transition-all z-10"
          >
            <ChevronLeft size={24} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setCurrentReelIndex(c => c + 1); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md hidden md:flex items-center justify-center hover:bg-black/40 transition-all z-10"
          >
            <ChevronRight size={24} />
          </button>

          {/* Info */}
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 z-10">
            <div className="flex items-center gap-3 mb-4">
              <img src={currentReel.avatar_url || 'https://picsum.photos/seed/user/100/100'} alt="" className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white object-cover" />
              <p className="font-bold text-sm md:text-base">@{currentReel.username}</p>
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!user) return alert('Please login to follow');
                  await fetch('/api/follow', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ follower_id: user.id, following_id: currentReel.user_id })
                  });
                  alert(`Followed @${currentReel.username}!`);
                }}
                className="px-3 py-1 rounded-full border border-white text-[8px] md:text-[10px] font-bold uppercase tracking-widest"
              >
                Follow
              </button>
            </div>
            <p className="text-xs md:text-sm mb-4 line-clamp-2">{currentReel.content}</p>
            <div className="flex items-center gap-2 text-[10px] md:text-xs text-white/70">
              <Play size={10} fill="currentColor" />
              <span className="truncate">Original Audio - {currentReel.username}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <Play size={64} className="text-white/10 mx-auto mb-4" />
          <p className="text-white/40">No reels found. Be the first to upload!</p>
        </div>
      )}
    </div>
  );
};

const ChatView = ({ user }: { user: UserData | null }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [activeChat, setActiveChat] = useState<any>(null);
  const [socket, setSocket] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [counts, setCounts] = useState({ unread: 0, groups: 0, favorites: 0 });

  useEffect(() => {
    if (user) {
      fetch(`/api/chat/counts/${user.id}`)
        .then(res => res.json())
        .then(data => setCounts(data));
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const newSocket = io();
      setSocket(newSocket);
      newSocket.emit('join', user.id);

      newSocket.on('receive_message', (msg: any) => {
        if (activeChat && (msg.sender_id === activeChat.id || msg.receiver_id === activeChat.id)) {
          setMessages(prev => {
            // Prevent duplicates
            if (prev.some(m => m.created_at === msg.created_at && m.content === msg.content)) return prev;
            return [...prev, msg];
          });
        }
      });

      return () => newSocket.close();
    }
  }, [user, activeChat]);

  useEffect(() => {
    if (user && activeChat) {
      fetch(`/api/messages/${user.id}/${activeChat.id}`)
        .then(res => res.json())
        .then(data => setMessages(data));
    }
  }, [user, activeChat]);

  const sendMessage = () => {
    if (!input.trim() || !activeChat || !socket) return;

    const msgData = {
      sender_id: user?.id,
      receiver_id: activeChat.id,
      content: input,
      created_at: new Date().toISOString()
    };

    socket.emit('send_message', msgData);
    setMessages(prev => [...prev, msgData]);
    setInput('');
  };

  const [friends, setFriends] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        if (user) {
          setFriends(data.filter((f: any) => f.id !== user.id));
        } else {
          setFriends(data);
        }
      });
  }, [user]);

  const filteredFriends = useMemo(() => {
    if (activeFilter === 'all') return friends;
    if (activeFilter === 'unread') return friends.filter(f => f.unreadCount > 0);
    // For groups and favorites, we'd need more complex logic or data. 
    // For now, let's just show all or a subset if we had the data.
    return friends;
  }, [friends, activeFilter]);

  if (!user) return <div className="flex items-center justify-center h-[80vh]">Please login to chat.</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 h-[calc(100vh-4rem)] flex flex-col lg:flex-row gap-8">
      {/* Sidebar */}
      <div className={cn(
        "w-full lg:w-96 border border-white/10 rounded-3xl overflow-hidden flex flex-col bg-white/5",
        activeChat ? "hidden lg:flex" : "flex"
      )}>
        <div className="p-6 border-b border-white/10">
          <h3 className="text-xl font-black tracking-tighter mb-4">MESSAGES</h3>
          
          <FilterMenu 
            className="mb-6"
            activeTab={activeFilter}
            onTabChange={setActiveFilter}
            onAddClick={() => alert('New Message/Group Action')}
            tabs={[
              { id: 'all', label: 'All' },
              { id: 'unread', label: 'Unread', count: counts.unread },
              { id: 'favorites', label: 'Favourites', count: counts.favorites },
              { id: 'groups', label: 'Groups', count: counts.groups },
            ]}
          />

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input 
              type="text" 
              placeholder="Search chats..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-white/30"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredFriends.map(friend => (
            <button 
              key={friend.id} 
              onClick={() => setActiveChat(friend)}
              className={cn(
                "w-full flex items-center gap-3 p-4 rounded-2xl transition-all text-left group",
                activeChat?.id === friend.id ? "bg-brand text-black" : "hover:bg-white/5"
              )}
            >
              <div className="relative">
                <img src={friend.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#050505]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <p className="font-bold text-sm truncate">{friend.username}</p>
                  <span className={cn("text-[10px]", activeChat?.id === friend.id ? "text-black/40" : "text-white/30")}>12:45</span>
                </div>
                <p className={cn("text-xs truncate", activeChat?.id === friend.id ? "text-black/60" : "text-white/50")}>Hey, did you see that new reel?</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className={cn(
        "flex-1 border border-white/10 rounded-3xl overflow-hidden flex flex-col bg-white/5",
        !activeChat ? "hidden lg:flex items-center justify-center" : "flex"
      )}>
        {activeChat ? (
          <>
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setActiveChat(null)} className="lg:hidden p-2 -ml-2 text-white/50">
                  <X size={20} />
                </button>
                <img src={activeChat.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <p className="font-bold text-sm">{activeChat.username}</p>
                  <p className="text-[10px] text-brand uppercase tracking-widest">Online</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button className="text-white/50 hover:text-white"><Settings size={20} /></button>
              </div>
            </div>
            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.sender_id === user?.id ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "rounded-2xl p-4 max-w-[70%] text-sm",
                    msg.sender_id === user?.id ? "bg-brand text-black rounded-tr-none" : "bg-white/10 text-white rounded-tl-none"
                  )}>
                    <p>{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-white/10">
              <div className="flex gap-4">
                <input 
                  type="text" 
                  placeholder="Type a message..." 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && sendMessage()}
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-sm focus:outline-none focus:border-white/30"
                />
                <button 
                  onClick={sendMessage}
                  className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center hover:scale-105 transition-all"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center p-12">
            <MessageSquare size={64} className="text-white/10 mx-auto mb-6" />
            <h3 className="text-2xl font-black tracking-tighter mb-2">YOUR MESSAGES</h3>
            <p className="text-white/40 max-w-xs mx-auto">Select a friend from the sidebar to start a real-time conversation.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const BlockbusterView = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-12">
        <h2 className="text-7xl font-black tracking-tighter mb-4">BLOCKBUSTER</h2>
        <p className="text-white/40 max-w-2xl text-lg">The ultimate destination for viral content, live events, and premium entertainment.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="group cursor-pointer">
            <div className="aspect-video rounded-3xl overflow-hidden bg-white/5 border border-white/10 mb-4 relative">
              <img 
                src={`https://picsum.photos/seed/block${i}/800/450`} 
                alt="" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
              <div className="absolute top-4 left-4 bg-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Live</div>
              <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold">12:45</div>
            </div>
            <h3 className="text-xl font-bold mb-2 group-hover:text-emerald-400 transition-colors">The Future of Digital Entertainment: STYN Keynote 2026</h3>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <span>STYN Events</span>
              <span>•</span>
              <span>1.2M Views</span>
              <span>•</span>
              <span>2 days ago</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProfileView = ({ user, onUpdateUser }: { user: UserData | null, onUpdateUser: (u: UserData) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [stats, setStats] = useState({ followers: 0, following: 0, posts: 0 });
  const [editData, setEditData] = useState({
    username: user?.username || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    bio: user?.bio || '',
    interests: user?.interests || '',
    avatar_url: user?.avatar_url || '',
    age: user?.age || '',
    gender: user?.gender || '',
    location: user?.location || ''
  });

  useEffect(() => {
    if (user) {
      fetch(`/api/users/${user.id}`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      })
      .then(res => res.json())
      .then(data => {
        setStats({ 
          followers: data.followersCount, 
          following: data.followingCount,
          posts: data.postsCount || 0
        });
      });
    }
  }, [user]);

  if (!user) return null;

  const handleSave = async () => {
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`
      },
      body: JSON.stringify({
        id: user.id,
        ...editData
      })
    });
    const updated = await res.json();
    const newUser = { ...updated, token: user.token };
    localStorage.setItem('styn_user', JSON.stringify(newUser));
    onUpdateUser(newUser);
    setIsEditing(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      <div className="bg-white/5 border border-white/10 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-br from-brand/20 to-orange-600/20" />
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="relative group">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-brand to-orange-600 border-4 border-[#050505] shadow-2xl mb-6 overflow-hidden">
               {editData.avatar_url ? <img src={editData.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={48} className="m-auto text-white mt-6 md:mt-8" />}
            </div>
            {isEditing && (
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                <PlusSquare size={24} />
                <input 
                  type="file" 
                  accept="image/*"
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setEditData({...editData, avatar_url: reader.result as string});
                      };
                      reader.readAsDataURL(file);
                    }
                  }} 
                />
                <span className="text-[10px] font-bold uppercase ml-2">Upload</span>
              </label>
            )}
          </div>

          {isEditing ? (
            <div className="w-full max-w-md space-y-4 mb-8">
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="text" 
                  value={editData.first_name} 
                  onChange={e => setEditData({...editData, first_name: e.target.value})}
                  placeholder="First Name"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-center text-sm font-bold focus:border-brand outline-none"
                />
                <input 
                  type="text" 
                  value={editData.last_name} 
                  onChange={e => setEditData({...editData, last_name: e.target.value})}
                  placeholder="Last Name"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-center text-sm font-bold focus:border-brand outline-none"
                />
              </div>
              <input 
                type="text" 
                value={editData.username} 
                onChange={e => setEditData({...editData, username: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-center text-2xl font-black tracking-tighter focus:border-brand outline-none"
              />
              <textarea 
                value={editData.bio} 
                onChange={e => setEditData({...editData, bio: e.target.value})}
                placeholder="Tell us about yourself..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-center text-sm focus:border-brand outline-none h-24"
              />
              <input 
                type="text" 
                value={editData.interests} 
                onChange={e => setEditData({...editData, interests: e.target.value})}
                placeholder="Interests (comma separated)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-center text-xs focus:border-brand outline-none"
              />
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="number" 
                  value={editData.age} 
                  onChange={e => setEditData({...editData, age: parseInt(e.target.value) || ''})}
                  placeholder="Age"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-center text-xs focus:border-brand outline-none"
                />
                <select 
                  value={editData.gender} 
                  onChange={e => setEditData({...editData, gender: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-center text-xs focus:border-brand outline-none appearance-none"
                >
                  <option value="" className="bg-zinc-900">Gender</option>
                  <option value="Male" className="bg-zinc-900">Male</option>
                  <option value="Female" className="bg-zinc-900">Female</option>
                  <option value="Other" className="bg-zinc-900">Other</option>
                </select>
              </div>
              <input 
                type="text" 
                value={editData.location} 
                onChange={e => setEditData({...editData, location: e.target.value})}
                placeholder="Location"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-center text-xs focus:border-brand outline-none"
              />
              <div className="flex gap-4">
                <button onClick={() => setIsEditing(false)} className="flex-1 py-2 rounded-xl border border-white/10 font-bold text-xs uppercase tracking-widest">Cancel</button>
                <button onClick={handleSave} className="flex-1 py-2 rounded-xl bg-brand text-black font-black text-xs uppercase tracking-widest">Save Changes</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl md:text-4xl font-black tracking-tighter">
                  {user.first_name} {user.last_name}
                  <span className="text-white/40 text-lg ml-2 font-medium">@{user.username}</span>
                </h2>
                {user.is_super_admin === 1 && (
                  <span className="bg-brand text-black text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Super Admin</span>
                )}
              </div>
              <p className="text-white/40 text-sm max-w-md mb-2">{user.bio || 'No bio yet.'}</p>
              <div className="flex gap-4 text-[10px] uppercase font-bold tracking-widest text-white/30 mb-4">
                {user.age && <span>{user.age} Years Old</span>}
                {user.gender && <span>{user.gender}</span>}
                {user.location && <span>{user.location}</span>}
              </div>
              <p className="text-brand font-mono text-xs md:text-sm uppercase tracking-[0.3em] mb-8">{user.level} LEVEL • {user.points} POINTS</p>
              <button 
                onClick={() => setIsEditing(true)}
                className="px-8 py-2 rounded-full border border-white/10 hover:bg-white hover:text-black transition-all font-bold text-xs uppercase tracking-widest mb-8"
              >
                Edit Profile
              </button>
            </>
          )}
          
          <div className="grid grid-cols-3 gap-4 md:gap-12 mb-12 border-y border-white/10 py-8 w-full max-w-lg">
            <div>
              <p className="text-xl md:text-2xl font-black tracking-tighter">{stats.followers}</p>
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Followers</p>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-black tracking-tighter">{stats.following}</p>
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Following</p>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-black tracking-tighter">{stats.posts}</p>
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Posts</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button className="bg-white text-black px-8 py-3 rounded-full font-bold flex items-center justify-center gap-2 hover:scale-105 transition-all">
              <Settings size={18} />
              Edit Profile
            </button>
            <button className="bg-white/10 text-white px-8 py-3 rounded-full font-bold flex items-center justify-center gap-2 hover:bg-white/20 transition-all">
              <Trophy size={18} />
              Rewards
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AuthView = ({ onLogin }: { onLogin: (u: UserData) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1); // 1: Auth, 2: Profile Details
  const [formData, setFormData] = useState({ 
    username: '', 
    first_name: '',
    last_name: '',
    email: '', 
    password: '',
    age: '',
    gender: '',
    location: '',
    bio: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (isLogin) {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, password: formData.password })
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          try {
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.error || 'Login failed');
          } catch {
            throw new Error(errorText || 'Login failed');
          }
        }

        const data = await res.json();
        onLogin({ ...data.user, token: data.token });
      } catch (err: any) {
        alert(err.message);
      } finally {
        setLoading(false);
      }
    } else {
      if (step === 1) {
        setStep(2);
        setLoading(false);
      } else {
        try {
          const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              username: formData.username, 
              email: formData.email, 
              password: formData.password,
              age: formData.age
            })
          });
          
          if (!res.ok) {
            const errorText = await res.text();
            try {
              const errorJson = JSON.parse(errorText);
              throw new Error(errorJson.error || 'Signup failed');
            } catch {
              throw new Error(errorText || 'Signup failed');
            }
          }

          const authData = await res.json();
          const { user, token } = authData;

          // Update profile with extra details
          const profileRes = await fetch('/api/profile', {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              id: user.id,
              username: user.username,
              first_name: formData.first_name,
              last_name: formData.last_name,
              age: parseInt(formData.age),
              gender: formData.gender,
              location: formData.location,
              bio: formData.bio
            })
          });

          if (!profileRes.ok) {
            const errorText = await profileRes.text();
            throw new Error(errorText || 'Failed to update profile');
          }

          const fullUser = await profileRes.json();
          onLogin({ ...fullUser, token });
        } catch (err: any) {
          alert(err.message);
        } finally {
          setLoading(false);
        }
      }
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-24">
      <div className="flex flex-col items-center mb-12">
        <h1 className="text-6xl font-black tracking-tighter italic">STYN</h1>
        <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/40 -mt-1">unique experience</p>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10">
        <h2 className="text-4xl font-black tracking-tighter mb-2 text-center">
          {isLogin ? 'WELCOME BACK' : step === 1 ? 'JOIN STYN' : 'COMPLETE PROFILE'}
        </h2>
        <p className="text-white/40 text-center mb-10 text-sm">
          {isLogin ? 'Enter your details to continue.' : step === 1 ? 'Start your journey with us.' : 'Tell us a bit more about yourself.'}
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {isLogin || step === 1 ? (
            <>
              {!isLogin && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4 mb-2 block">Username</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-white/30"
                    placeholder="Choose a unique handle"
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                  />
                </div>
              )}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4 mb-2 block">Email Address</label>
                <input 
                  type="email" 
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-white/30"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4 mb-2 block">Password</label>
                <input 
                  type="password" 
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-white/30"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4 mb-2 block">First Name</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-white/30"
                    placeholder="John"
                    value={formData.first_name}
                    onChange={e => setFormData({...formData, first_name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4 mb-2 block">Last Name</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-white/30"
                    placeholder="Doe"
                    value={formData.last_name}
                    onChange={e => setFormData({...formData, last_name: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4 mb-2 block">Age</label>
                  <input 
                    type="number" 
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-white/30"
                    placeholder="24"
                    value={formData.age}
                    onChange={e => setFormData({...formData, age: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4 mb-2 block">Gender</label>
                  <select 
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-white/30 appearance-none"
                    value={formData.gender}
                    onChange={e => setFormData({...formData, gender: e.target.value})}
                  >
                    <option value="" className="bg-zinc-900">Select</option>
                    <option value="Male" className="bg-zinc-900">Male</option>
                    <option value="Female" className="bg-zinc-900">Female</option>
                    <option value="Other" className="bg-zinc-900">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4 mb-2 block">Location</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-white/30"
                  placeholder="City, Country"
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4 mb-2 block">Biography</label>
                <textarea 
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-white/30 h-32"
                  placeholder="Tell us about yourself..."
                  value={formData.bio}
                  onChange={e => setFormData({...formData, bio: e.target.value})}
                />
              </div>
            </>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest mt-6 hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : step === 1 ? 'Next Step' : 'Complete Signup'}
          </button>
          
          {!isLogin && step === 2 && (
            <button 
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-xs text-white/40 hover:text-white transition-colors mt-2"
            >
              Back to account details
            </button>
          )}
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => {
              setIsLogin(!isLogin);
              setStep(1);
            }}
            className="text-xs text-white/40 hover:text-white transition-colors"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
};
