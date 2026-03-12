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
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { io } from 'socket.io-client';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type View = 'home' | 'dating' | 'reels' | 'chat' | 'blockbuster' | 'profile' | 'admin' | 'auth';

interface UserData {
  id: number;
  username: string;
  email: string;
  avatar_url?: string;
  points: number;
  level: string;
  bio?: string;
  interests?: string;
  is_super_admin?: number;
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
          <h1 className="text-2xl font-black tracking-tighter text-white cursor-pointer" onClick={() => handleNav('home')}>STYN</h1>
          
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
            <div className="flex items-center gap-2 md:gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] text-brand font-mono uppercase tracking-widest">{user.level}</p>
              </div>
              <button 
                onClick={() => handleNav('profile')}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-brand to-orange-600 border border-white/20 overflow-hidden flex items-center justify-center"
              >
                {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={18} className="text-white" />}
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
        return <ReelsView />;
      case 'chat':
        return <ChatView user={user} />;
      case 'blockbuster':
        return <BlockbusterView />;
      case 'admin':
        return <AdminView />;
      case 'profile':
        return <ProfileView user={user} />;
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
      <button 
        onClick={() => setView('admin')}
        className="fixed bottom-20 lg:bottom-4 right-4 w-10 h-10 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white/20 hover:text-white hover:bg-white/10 transition-all z-50"
      >
        <Settings size={16} />
      </button>
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
        <p className="text-white/40 font-mono text-xs uppercase tracking-[0.4em] mb-12">Social • Dating • Entertainment</p>
        
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

const AdminView = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h2 className="text-5xl font-black tracking-tighter">ADMIN PANEL</h2>
          <p className="text-white/40">Platform overview and management dashboard.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-center">
            <p className="text-2xl font-black">1.2M</p>
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Active Users</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-center">
            <p className="text-2xl font-black">450k</p>
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Daily Posts</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
          <h3 className="text-xl font-bold mb-6">Content Moderation Queue</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/10" />
                  <div>
                    <p className="font-bold text-sm">Reported Post #{1234 + i}</p>
                    <p className="text-xs text-white/40">Reported by 12 users • Hate Speech</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500 hover:text-white transition-all">Remove</button>
                  <button className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all">Dismiss</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
          <h3 className="text-xl font-bold mb-6">System Health</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-white/40 mb-2">
                <span>Server Load</span>
                <span className="text-emerald-400">42%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 w-[42%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-white/40 mb-2">
                <span>Storage (CDN)</span>
                <span className="text-indigo-400">68%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-400 w-[68%]" />
              </div>
            </div>
            <div className="pt-6 border-t border-white/10">
              <h4 className="text-xs font-black uppercase tracking-widest text-white/30 mb-4">Quick Actions</h4>
              <div className="grid grid-cols-2 gap-2">
                <button className="p-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all">Broadcast</button>
                <button className="p-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all">Maintenance</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const HomeView = ({ setView, user }: { setView: (v: View) => void, user: UserData | null }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-8 md:mb-12">
        <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 uppercase">DISCOVER<br/><span className="text-white/20 italic serif normal-case">The Pulse of STYN</span></h2>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {['Trending', 'Featured', 'Gaming', 'Music', 'Tech'].map(tag => (
            <span key={tag} className="flex-shrink-0 px-4 py-1 rounded-full border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/50 hover:border-brand hover:text-brand cursor-pointer transition-all">
              #{tag}
            </span>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Feed */}
        <div className="lg:col-span-8 space-y-6 md:space-y-8">
          <AdBanner />
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden group">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand to-orange-400" />
                  <div>
                    <p className="text-sm font-bold">creator_name_{i}</p>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest">2 hours ago</p>
                  </div>
                </div>
                <button className="text-white/30 hover:text-white"><MoreVertical size={20} /></button>
              </div>
              <div className="aspect-video bg-black relative overflow-hidden">
                <img 
                  src={`https://picsum.photos/seed/styn${i}/1200/800`} 
                  alt="" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-6">
                <p className="text-base md:text-lg font-medium mb-4">Exploring the new STYN interface. The Peach Orange theme is just incredible! 🍑 #styn #social #future</p>
                <div className="flex items-center gap-6">
                  <button 
                    onClick={() => {
                      if (user) {
                        fetch('/api/activity', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ user_id: user.id, activity_type: 'like', target_id: i })
                        });
                      }
                    }}
                    className="flex items-center gap-2 text-white/50 hover:text-brand transition-colors"
                  >
                    <ThumbsUp size={20} />
                    <span className="text-sm font-bold">1.2k</span>
                  </button>
                  <button className="flex items-center gap-2 text-white/50 hover:text-brand transition-colors">
                    <MessageSquare size={20} />
                    <span className="text-sm font-bold">84</span>
                  </button>
                  <button className="flex items-center gap-2 text-white/50 hover:text-white transition-colors ml-auto">
                    <Share2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/30 mb-6">Recommended Profiles</h3>
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10" />
                    <div>
                      <p className="text-sm font-bold">user_handle_{i}</p>
                      <p className="text-[10px] text-brand">98% Match</p>
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      if (user) {
                        await fetch('/api/follow', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ follower_id: user.id, following_id: i }) // i is mock user id here
                        });
                        alert('Follow status updated!');
                      }
                    }}
                    className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-white/20 hover:bg-brand hover:text-black transition-all"
                  >
                    Follow
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-gradient-to-br from-brand to-orange-600 rounded-3xl p-6 relative overflow-hidden group cursor-pointer" onClick={() => setView('reels')}>
            <div className="relative z-10">
              <h3 className="text-2xl font-black tracking-tighter mb-2 text-black">WATCH REELS</h3>
              <p className="text-sm text-black/70 mb-4">Endless entertainment at your fingertips.</p>
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-brand bg-black/20" />
                ))}
                <div className="w-8 h-8 rounded-full border-2 border-brand bg-black/10 flex items-center justify-center text-[10px] font-bold text-black">+12k</div>
              </div>
            </div>
            <Play className="absolute -bottom-4 -right-4 w-32 h-32 text-black/10 group-hover:scale-110 transition-transform" />
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
          onClick={() => setCurrentIndex(c => c + 1)}
          className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-all"
        >
          <PlusSquare size={24} />
        </button>
      </div>
    </div>
  );
};

const ReelsView = () => {
  const [showUpload, setShowUpload] = useState(false);
  const [reelContent, setReelContent] = useState('');
  const [reelMedia, setReelMedia] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReelMedia(reader.result as string);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    const savedUser = localStorage.getItem('styn_user');
    if (!savedUser) return alert('Please login to upload');
    const user = JSON.parse(savedUser);

    if (!reelMedia) return alert('Please select a file first');

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
    setReelMedia('');
    alert('Reel uploaded successfully!');
  };

  return (
    <div className="h-[calc(100vh-4rem)] bg-black flex items-center justify-center relative">
      <button 
        onClick={() => setShowUpload(true)}
        className="absolute top-8 right-8 z-30 bg-brand text-black px-6 py-2 rounded-full font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
      >
        Upload Reel
      </button>

      {showUpload && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[60] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 w-full max-w-md">
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

      <div className="h-full aspect-[9/16] bg-zinc-900 relative group overflow-hidden">
        <img 
          src="https://picsum.photos/seed/reel1/1080/1920" 
          alt="" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
        
        {/* Interaction Sidebar */}
        <div className="absolute right-4 bottom-24 flex flex-col gap-6 items-center">
          <div className="flex flex-col items-center gap-1">
            <button className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all">
              <Heart size={24} />
            </button>
            <span className="text-[10px] font-bold">42.5k</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <button className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all">
              <MessageSquare size={24} />
            </button>
            <span className="text-[10px] font-bold">1.2k</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <button className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all">
              <Share2 size={24} />
            </button>
            <span className="text-[10px] font-bold">Share</span>
          </div>
        </div>

        {/* Info */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full border-2 border-white bg-white/20" />
            <p className="font-bold">@styn_official</p>
            <button 
              onClick={async () => {
                const savedUser = localStorage.getItem('styn_user');
                if (!savedUser) return alert('Please login to follow');
                const user = JSON.parse(savedUser);
                await fetch('/api/follow', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ follower_id: user.id, following_id: 1 }) // mock official id
                });
                alert('Followed official account!');
              }}
              className="px-3 py-1 rounded-full border border-white text-[10px] font-bold uppercase tracking-widest"
            >
              Follow
            </button>
          </div>
          <p className="text-sm mb-4">Check out this amazing sunset! 🌅 #nature #vibes #styn</p>
          <div className="flex items-center gap-2 text-xs text-white/70">
            <Play size={12} fill="currentColor" />
            <span>Original Audio - styn_official</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatView = ({ user }: { user: UserData | null }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [activeChat, setActiveChat] = useState<any>(null);
  const [socket, setSocket] = useState<any>(null);

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

  if (!user) return <div className="flex items-center justify-center h-[80vh]">Please login to chat.</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 h-[calc(100vh-4rem)] flex flex-col lg:flex-row gap-8">
      {/* Sidebar */}
      <div className={cn(
        "w-full lg:w-80 border border-white/10 rounded-3xl overflow-hidden flex flex-col bg-white/5",
        activeChat ? "hidden lg:flex" : "flex"
      )}>
        <div className="p-6 border-b border-white/10">
          <h3 className="text-xl font-black tracking-tighter mb-4">MESSAGES</h3>
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
          {friends.map(friend => (
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

const ProfileView = ({ user }: { user: UserData | null }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    username: user?.username || '',
    bio: user?.bio || '',
    interests: user?.interests || '',
    avatar_url: user?.avatar_url || ''
  });

  if (!user) return null;

  const handleSave = async () => {
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: user.id,
        ...editData
      })
    });
    const updated = await res.json();
    localStorage.setItem('styn_user', JSON.stringify(updated));
    window.location.reload(); // Simple way to refresh state
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
              <div className="flex gap-4">
                <button onClick={() => setIsEditing(false)} className="flex-1 py-2 rounded-xl border border-white/10 font-bold text-xs uppercase tracking-widest">Cancel</button>
                <button onClick={handleSave} className="flex-1 py-2 rounded-xl bg-brand text-black font-black text-xs uppercase tracking-widest">Save Changes</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl md:text-4xl font-black tracking-tighter">{user.username}</h2>
                {user.is_super_admin === 1 && (
                  <span className="bg-brand text-black text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Super Admin</span>
                )}
              </div>
              <p className="text-white/40 text-sm max-w-md mb-4">{user.bio || 'No bio yet.'}</p>
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
              <p className="text-xl md:text-2xl font-black tracking-tighter">1.2k</p>
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Followers</p>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-black tracking-tighter">482</p>
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Following</p>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-black tracking-tighter">154</p>
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
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login/signup
    onLogin({
      id: 1,
      username: formData.username || formData.email.split('@')[0],
      email: formData.email,
      points: 100,
      level: 'Bronze'
    });
  };

  return (
    <div className="max-w-md mx-auto px-4 py-24">
      <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10">
        <h2 className="text-4xl font-black tracking-tighter mb-2 text-center">{isLogin ? 'WELCOME BACK' : 'JOIN STYN'}</h2>
        <p className="text-white/40 text-center mb-10 text-sm">Enter your details to continue your journey.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <button type="submit" className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest mt-6 hover:scale-[1.02] transition-all">
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs text-white/40 hover:text-white transition-colors"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
};
