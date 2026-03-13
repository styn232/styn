import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('styn.db');
const JWT_SECRET = 'styn_super_secret_key_2026';

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    first_name TEXT,
    last_name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    phone TEXT,
    bio TEXT,
    location TEXT,
    avatar_url TEXT,
    interests TEXT,
    points INTEGER DEFAULT 0,
    level TEXT DEFAULT 'Bronze',
    is_super_admin INTEGER DEFAULT 0,
    is_verified INTEGER DEFAULT 0,
    is_banned INTEGER DEFAULT 0,
    age INTEGER,
    gender TEXT,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

try {
  db.prepare('ALTER TABLE users ADD COLUMN first_name TEXT').run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE users ADD COLUMN last_name TEXT').run();
} catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS user_points (
    user_id INTEGER PRIMARY KEY,
    points_total INTEGER DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS user_levels (
    user_id INTEGER PRIMARY KEY,
    level TEXT DEFAULT 'Bronze',
    points_required INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS ads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT,
    media_url TEXT,
    link_url TEXT,
    placement TEXT, -- 'home', 'reels', 'sidebar', 'blockbuster'
    status TEXT DEFAULT 'active', -- 'active', 'paused'
    revenue REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    content TEXT,
    media_url TEXT,
    type TEXT, -- 'post', 'reel', 'blockbuster'
    likes_count INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    user_id INTEGER,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(post_id) REFERENCES posts(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS likes (
    user_id INTEGER,
    post_id INTEGER,
    PRIMARY KEY(user_id, post_id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(post_id) REFERENCES posts(id)
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user1_id INTEGER,
    user2_id INTEGER,
    status TEXT DEFAULT 'pending', -- 'pending', 'matched', 'rejected'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user1_id) REFERENCES users(id),
    FOREIGN KEY(user2_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_id INTEGER,
    content TEXT,
    media_url TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(receiver_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER,
    following_id INTEGER,
    PRIMARY KEY(follower_id, following_id),
    FOREIGN KEY(follower_id) REFERENCES users(id),
    FOREIGN KEY(following_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS user_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    activity_type TEXT, -- 'like', 'comment', 'reel_view', 'post_view', 'share'
    target_id INTEGER, -- post_id or reel_id
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    post_id INTEGER,
    reason TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'resolved', 'dismissed'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(post_id) REFERENCES posts(id)
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    message TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    game_url TEXT,
    thumbnail TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS banned_ips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT UNIQUE,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT,
    source TEXT,
    image_url TEXT,
    location TEXT, -- 'South Africa', 'Zimbabwe'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_groups (
    user_id INTEGER,
    group_id INTEGER,
    role TEXT DEFAULT 'member', -- 'admin', 'member'
    PRIMARY KEY(user_id, group_id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(group_id) REFERENCES groups(id)
  );

  -- Performance Indexes
  CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages(sender_id, receiver_id);
  CREATE INDEX IF NOT EXISTS idx_messages_receiver_read ON messages(receiver_id, is_read);
  CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
  CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);
  CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
  CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
  CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
  CREATE INDEX IF NOT EXISTS idx_matches_users ON matches(user1_id, user2_id);
`);

// --- HELPERS ---
const addPoints = (userId: number, amount: number) => {
  const user = db.prepare('SELECT points, last_login FROM users WHERE id = ?').get(userId);
  if (!user) return;

  // Check for daily login (2 points)
  let finalAmount = amount;
  const today = new Date().toISOString().split('T')[0];
  const lastLoginDay = user.last_login ? user.last_login.split('T')[0] : null;
  
  if (lastLoginDay !== today) {
    finalAmount += 2;
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
  }

  const newPoints = user.points + finalAmount;
  let level = 'Bronze';
  if (newPoints >= 5000) level = 'Gold';
  else if (newPoints >= 1000) level = 'Silver';

  db.prepare('UPDATE users SET points = ?, level = ? WHERE id = ?').run(newPoints, level, userId);
  db.prepare('INSERT OR REPLACE INTO user_points (user_id, points_total, last_updated) VALUES (?, ?, CURRENT_TIMESTAMP)').run(userId, newPoints);
  db.prepare('INSERT OR REPLACE INTO user_levels (user_id, level, points_required) VALUES (?, ?, ?)').run(userId, level, level === 'Gold' ? 5000 : (level === 'Silver' ? 1000 : 0));
};

const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const adminOnly = (req: any, res: any, next: any) => {
  if (req.user && req.user.is_super_admin) {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

const checkIPBan = (req: any, res: any, next: any) => {
  const ip = req.ip;
  const banned = db.prepare('SELECT * FROM banned_ips WHERE ip_address = ?').get(ip);
  if (banned) {
    res.status(403).json({ error: 'Your IP is banned', reason: banned.reason });
  } else {
    next();
  }
};

// --- SEED DATA ---
const seedData = () => {
  // Initialize site settings
  const settings = db.prepare('SELECT COUNT(*) as count FROM site_settings').get().count;
  if (settings === 0) {
    const defaultSettings = [
      ['site_name', 'STYN'],
      ['site_title', 'STYN - Social Media Platform'],
      ['seo_keywords', 'social, media, styn, connect'],
      ['theme', 'dark'],
      ['analytics_code', '']
    ];
    defaultSettings.forEach(([key, value]) => {
      db.prepare('INSERT INTO site_settings (key, value) VALUES (?, ?)').run(key, value);
    });
  }

  const superAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get('styn@styni.com');
  let adminId: number | bigint = 0;
  if (!superAdmin) {
    const hashedPassword = bcrypt.hashSync('chiminya', 10);
    const info = db.prepare(`
      INSERT INTO users (username, email, password, is_super_admin, bio, avatar_url, interests) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'SuperAdmin', 
      'styn@styni.com', 
      hashedPassword, 
      1, 
      'The official STYN Super Administrator.', 
      'https://picsum.photos/seed/admin/200/200',
      'Technology, Management, Innovation'
    );
    adminId = info.lastInsertRowid;
  } else {
    adminId = superAdmin.id;
  }

  // Add some reels for Super Admin
  const reelCount = db.prepare("SELECT COUNT(*) as count FROM posts WHERE type = 'reel'").get().count;
  if (reelCount < 5) {
    const sampleReels = [
      ['Vibrant Cape Town Streets 🇿🇦', 'https://picsum.photos/seed/sa_reel1/1080/1920'],
      ['Sunset at Victoria Falls 🇿🇼', 'https://picsum.photos/seed/zim_reel1/1080/1920'],
      ['Johannesburg Nightlife Vibes', 'https://picsum.photos/seed/sa_reel2/1080/1920'],
      ['Traditional Dance in Harare', 'https://picsum.photos/seed/zim_reel2/1080/1920'],
      ['Wildlife Safari Highlights', 'https://picsum.photos/seed/sa_reel3/1080/1920']
    ];
    sampleReels.forEach(([content, url]) => {
      db.prepare('INSERT INTO posts (user_id, content, media_url, type) VALUES (?, ?, ?, ?)').run(
        adminId, content, url, 'reel'
      );
    });
  }

  // Seed 10 South African Profiles
  const saProfilesCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE location LIKE '%South Africa%'").get().count;
  if (saProfilesCount < 10) {
    const saGirls = [
      ['Zanele M.', 'zanele@styn.sa', 'Cape Town, South Africa', 'Fashion, Design, Music'],
      ['Lerato K.', 'lerato@styn.sa', 'Johannesburg, South Africa', 'Tech, Entrepreneurship, Travel'],
      ['Nomvula S.', 'nomvula@styn.sa', 'Durban, South Africa', 'Surfing, Yoga, Nature'],
      ['Thandiwe B.', 'thandi@styn.sa', 'Pretoria, South Africa', 'Politics, Law, Reading'],
      ['Buhle X.', 'buhle@styn.sa', 'Soweto, South Africa', 'Dance, Community, Art'],
      ['Aphiwe N.', 'aphiwe@styn.sa', 'Port Elizabeth, South Africa', 'Marine Biology, Photography'],
      ['Mbali R.', 'mbali@styn.sa', 'Bloemfontein, South Africa', 'Agriculture, Cooking, Family'],
      ['Nandi G.', 'nandi@styn.sa', 'East London, South Africa', 'Poetry, Jazz, History'],
      ['Siphesihle W.', 'siphe@styn.sa', 'Mbombela, South Africa', 'Wildlife, Conservation, Hiking'],
      ['Khanyisile T.', 'khanyi@styn.sa', 'Polokwane, South Africa', 'Education, Sports, Fitness']
    ];

    saGirls.forEach(([name, email, loc, interests]) => {
      db.prepare(`
        INSERT INTO users (username, email, password, location, interests, bio, avatar_url, gender, age) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        name, email, 'password123', loc, interests, 
        `Proudly South African 🇿🇦. Interested in ${interests}.`,
        `https://picsum.photos/seed/${name.replace(' ', '')}/400/400`,
        'Female', Math.floor(Math.random() * 10) + 20
      );
    });
  }

  // Seed News
  const newsCount = db.prepare('SELECT COUNT(*) as count FROM news').get().count;
  if (newsCount === 0) {
    const newsItems = [
      ['SA Tech Hub Growth', 'South Africa continues to lead the continent in tech innovation hubs.', 'STYN News', 'https://picsum.photos/seed/news1/800/400', 'South Africa'],
      ['Zim Tourism Boost', 'Victoria Falls sees record numbers of international visitors this season.', 'Zim Daily', 'https://picsum.photos/seed/news2/800/400', 'Zimbabwe'],
      ['Renewable Energy in SA', 'New solar farm projects launched in Northern Cape.', 'Green SA', 'https://picsum.photos/seed/news3/800/400', 'South Africa'],
      ['Harare Art Festival', 'Local artists showcase vibrant culture at the annual Harare festival.', 'Harare Times', 'https://picsum.photos/seed/news4/800/400', 'Zimbabwe'],
      ['SA Economic Outlook', 'Experts predict steady growth for the South African economy in 2026.', 'Finance SA', 'https://picsum.photos/seed/news5/800/400', 'South Africa']
    ];
    newsItems.forEach(([title, content, source, img, loc]) => {
      db.prepare('INSERT INTO news (title, content, source, image_url, location) VALUES (?, ?, ?, ?, ?)').run(
        title, content, source, img, loc
      );
    });
  }
};

seedData();

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  app.use(express.json());
  app.use(checkIPBan);

  // --- API ROUTES ---

  // Auth
  app.post('/api/auth/signup', (req, res) => {
    const { username, email, password, age } = req.body;
    if (age && parseInt(age) < 18) {
      return res.status(400).json({ error: 'You must be at least 18 years old to join.' });
    }
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const info = db.prepare('INSERT INTO users (username, email, password, age) VALUES (?, ?, ?, ?)').run(username, email, hashedPassword, age);
      const user = { id: info.lastInsertRowid, username, email, is_super_admin: 0, age };
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
      res.json({ user, token });
    } catch (err) {
      res.status(400).json({ error: 'User already exists' });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (user && bcrypt.compareSync(password, user.password)) {
      // Daily login points
      const today = new Date().toISOString().split('T')[0];
      const lastLogin = user.last_login ? user.last_login.split('T')[0] : '';
      if (today !== lastLogin) {
        addPoints(user.id, 2);
        db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
      }

      const token = jwt.sign({ id: user.id, username: user.username, is_super_admin: user.is_super_admin }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ user, token });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  // Points & Levels
  app.get('/api/points/user/:id', (req, res) => {
    const points = db.prepare('SELECT * FROM user_points WHERE user_id = ?').get(req.params.id);
    res.json(points || { points_total: 0 });
  });

  app.get('/api/points/leaderboard', (req, res) => {
    const leaderboard = db.prepare('SELECT users.username, user_points.points_total FROM user_points JOIN users ON user_points.user_id = users.id ORDER BY points_total DESC LIMIT 10').all();
    res.json(leaderboard);
  });

  app.post('/api/points/add', authenticateToken, adminOnly, (req, res) => {
    const { user_id, amount } = req.body;
    addPoints(user_id, amount);
    res.json({ success: true });
  });

  app.get('/api/levels/user/:id', (req, res) => {
    const level = db.prepare('SELECT * FROM user_levels WHERE user_id = ?').get(req.params.id);
    res.json(level || { level: 'Bronze' });
  });

  app.get('/api/levels', (req, res) => {
    const levels = db.prepare('SELECT level, COUNT(*) as count FROM user_levels GROUP BY level').all();
    res.json(levels);
  });

  // User Profile & Social
  app.put('/api/profile', authenticateToken, (req: any, res: any) => {
    const { id, username, first_name, last_name, bio, avatar_url, interests, age, gender, location } = req.body;
    if (req.user.id !== id && !req.user.is_super_admin) return res.sendStatus(403);
    
    if (age && age < 18) {
      return res.status(400).json({ error: 'Minimum age requirement is 18.' });
    }

    try {
      db.prepare(`
        UPDATE users 
        SET username = ?, first_name = ?, last_name = ?, bio = ?, avatar_url = ?, interests = ?, age = ?, gender = ?, location = ? 
        WHERE id = ?
      `).run(username, first_name, last_name, bio, avatar_url, interests, age, gender, location, id);
      const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      res.json(updatedUser);
    } catch (err) {
      res.status(400).json({ error: 'Failed to update profile' });
    }
  });

  app.get('/api/users/:id', authenticateToken, (req: any, res: any) => {
    const user = db.prepare('SELECT id, username, first_name, last_name, bio, location, avatar_url, interests, points, level, age, gender FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const isFollowing = db.prepare('SELECT * FROM follows WHERE follower_id = ? AND following_id = ?').get(req.user.id, req.params.id);
    const followersCount = db.prepare('SELECT COUNT(*) as count FROM follows WHERE following_id = ?').get(req.params.id).count;
    const followingCount = db.prepare('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?').get(req.params.id).count;
    const postsCount = db.prepare('SELECT COUNT(*) as count FROM posts WHERE user_id = ? AND is_deleted = 0').get(req.params.id).count;
    
    res.json({ 
      ...user, 
      isFollowing: !!isFollowing,
      followersCount,
      followingCount,
      postsCount
    });
  });

  app.post('/api/follow', authenticateToken, (req: any, res: any) => {
    const { follower_id, following_id } = req.body;
    if (req.user.id !== follower_id) return res.sendStatus(403);
    const existing = db.prepare('SELECT * FROM follows WHERE follower_id = ? AND following_id = ?').get(follower_id, following_id);
    
    if (existing) {
      db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(follower_id, following_id);
      res.json({ followed: false });
    } else {
      db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)').run(follower_id, following_id);
      res.json({ followed: true });
    }
  });

  app.get('/api/ads', (req, res) => {
    const placement = req.query.placement || 'home';
    const ads = db.prepare("SELECT * FROM ads WHERE status = 'active' AND placement = ? ORDER BY RANDOM() LIMIT 1").all(placement);
    res.json(ads);
  });

  // Admin Endpoints
  app.get('/api/admin/stats', authenticateToken, adminOnly, (req: any, res: any) => {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const newUsersToday = db.prepare("SELECT COUNT(*) as count FROM users WHERE date(created_at) = date('now')").get().count;
    const totalPosts = db.prepare("SELECT COUNT(*) as count FROM posts WHERE type = 'post'").get().count;
    const totalReels = db.prepare("SELECT COUNT(*) as count FROM posts WHERE type = 'reel'").get().count;
    const totalMessages = db.prepare('SELECT COUNT(*) as count FROM messages').get().count;
    const activeUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE date(last_login) = date('now')").get().count;
    const topUsers = db.prepare('SELECT username, points FROM users ORDER BY points DESC LIMIT 5').all();
    const adRevenue = db.prepare('SELECT SUM(revenue) as total FROM ads').get().total || 0;
    
    res.json({ totalUsers, newUsersToday, totalPosts, totalReels, totalMessages, activeUsers, topUsers, adRevenue });
  });

  app.post('/api/admin/cleanup-followers', authenticateToken, adminOnly, (req: any, res: any) => {
    try {
      // Define "fake" as users with no first_name or last_name
      const info = db.prepare(`
        DELETE FROM follows 
        WHERE follower_id IN (SELECT id FROM users WHERE first_name IS NULL OR last_name IS NULL)
      `).run();
      res.json({ success: true, removedCount: info.changes });
    } catch (err) {
      res.status(500).json({ error: 'Failed to cleanup followers' });
    }
  });

  app.get('/api/admin/users', authenticateToken, adminOnly, (req: any, res: any) => {
    const users = db.prepare('SELECT * FROM users').all();
    res.json(users);
  });

  // Posts & Reels
  app.get('/api/posts', (req, res) => {
    const type = req.query.type;
    let query = `
      SELECT posts.*, users.username, users.avatar_url 
      FROM posts 
      JOIN users ON posts.user_id = users.id 
      WHERE posts.is_deleted = 0
    `;
    if (type) {
      query += ` AND posts.type = ?`;
    }
    query += ` ORDER BY posts.created_at DESC LIMIT 50`;
    
    const posts = type ? db.prepare(query).all(type) : db.prepare(query).all();
    
    // Add comments and like status for each post
    const postsWithDetails = posts.map(post => {
      const comments = db.prepare('SELECT comments.*, users.username, users.avatar_url FROM comments JOIN users ON comments.user_id = users.id WHERE post_id = ? ORDER BY created_at ASC').all(post.id);
      const likes = db.prepare('SELECT COUNT(*) as count FROM likes WHERE post_id = ?').get(post.id).count;
      return { ...post, comments, likes_count: likes };
    });
    
    res.json(postsWithDetails);
  });

  app.post('/api/posts/like', authenticateToken, (req: any, res: any) => {
    const { user_id, post_id } = req.body;
    if (req.user.id !== user_id) return res.sendStatus(403);
    try {
      const existing = db.prepare('SELECT * FROM likes WHERE user_id = ? AND post_id = ?').get(user_id, post_id);
      if (existing) {
        db.prepare('DELETE FROM likes WHERE user_id = ? AND post_id = ?').run(user_id, post_id);
        res.json({ liked: false });
      } else {
        db.prepare('INSERT INTO likes (user_id, post_id) VALUES (?, ?)').run(user_id, post_id);
        addPoints(user_id, 5); // Share/Like points
        res.json({ liked: true });
      }
    } catch (err) {
      res.status(400).json({ error: 'Action failed' });
    }
  });

  app.post('/api/posts/comment', authenticateToken, (req: any, res: any) => {
    const { user_id, post_id, content } = req.body;
    if (req.user.id !== user_id) return res.sendStatus(403);
    try {
      db.prepare('INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)').run(user_id, post_id, content);
      addPoints(user_id, 5);
      const newComment = db.prepare('SELECT comments.*, users.username, users.avatar_url FROM comments JOIN users ON comments.user_id = users.id WHERE comments.id = last_insert_rowid()').get();
      res.json(newComment);
    } catch (err) {
      res.status(400).json({ error: 'Comment failed' });
    }
  });

  app.get('/api/news', (req, res) => {
    const news = db.prepare('SELECT * FROM news ORDER BY created_at DESC').all();
    res.json(news);
  });

  app.post('/api/posts', authenticateToken, (req: any, res: any) => {
    const { user_id, content, media_url, type } = req.body;
    if (req.user.id !== user_id) return res.sendStatus(403);
    const info = db.prepare('INSERT INTO posts (user_id, content, media_url, type) VALUES (?, ?, ?, ?)').run(user_id, content, media_url, type);
    
    // Reward points
    if (type === 'reel') {
      addPoints(user_id, 15);
    } else {
      addPoints(user_id, 10);
    }
    
    res.json({ id: info.lastInsertRowid });
  });

  app.post('/api/reports', authenticateToken, (req, res) => {
    const { user_id, post_id, reason } = req.body;
    db.prepare('INSERT INTO reports (user_id, post_id, reason) VALUES (?, ?, ?)').run(user_id, post_id, reason);
    res.json({ success: true });
  });

  // Dating - Advanced Matching Algorithm
  app.get('/api/dating/suggestions', (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'User ID required' });

    const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    const currentInterests = (currentUser.interests || '').split(',').map((i: string) => i.trim().toLowerCase()).filter(Boolean);

    // Get activity of current user to find content preferences
    const currentUserActivity = db.prepare(`
      SELECT target_id, activity_type FROM user_activity WHERE user_id = ?
    `).all(user_id);

    // Find potential candidates
    const candidates = db.prepare(`
      SELECT * FROM users 
      WHERE id != ? 
      AND id NOT IN (SELECT user2_id FROM matches WHERE user1_id = ?)
    `).all(user_id, user_id);

    const scoredCandidates = candidates.map((candidate: any) => {
      let score = 0;

      // 1. Shared Interests Score (Weight: 40%)
      const candidateInterests = (candidate.interests || '').split(',').map((i: string) => i.trim().toLowerCase()).filter(Boolean);
      const sharedInterests = currentInterests.filter((i: string) => candidateInterests.includes(i));
      score += (sharedInterests.length * 10); // 10 points per shared interest

      // 2. Activity Similarity Score (Weight: 30%)
      // Check if they liked/viewed the same posts
      const candidateActivity = db.prepare(`
        SELECT target_id FROM user_activity WHERE user_id = ?
      `).all(candidate.id);
      
      const sharedActivity = currentUserActivity.filter((act: any) => 
        candidateActivity.some((cAct: any) => cAct.target_id === act.target_id)
      );
      score += (sharedActivity.length * 5); // 5 points per shared interaction

      // 3. Engagement Level Score (Weight: 20%)
      // Active users get a small boost to ensure better response rates
      const engagementScore = Math.min(candidate.points / 100, 20); 
      score += engagementScore;

      // 4. Match Success Feedback (Weight: 10%)
      // Boost users who have high success rates in previous matches
      const successRate = db.prepare(`
        SELECT AVG(success_score) as avg_success 
        FROM match_feedback 
        JOIN matches ON match_feedback.match_id = matches.id
        WHERE matches.user1_id = ? OR matches.user2_id = ?
      `).get(candidate.id, candidate.id).avg_success || 0;
      score += (successRate / 10);

      return {
        ...candidate,
        matchScore: Math.min(Math.round(score), 100),
        sharedInterests
      };
    });

    // Sort by score descending
    scoredCandidates.sort((a: any, b: any) => b.matchScore - a.matchScore);

    res.json(scoredCandidates.slice(0, 10));
  });

  // Track user activity
  app.post('/api/activity', (req, res) => {
    const { user_id, activity_type, target_id } = req.body;
    db.prepare('INSERT INTO user_activity (user_id, activity_type, target_id) VALUES (?, ?, ?)').run(user_id, activity_type, target_id);
    res.json({ success: true });
  });

  app.post('/api/dating/swipe', (req, res) => {
    const { user1_id, user2_id, status } = req.body;
    db.prepare('INSERT INTO matches (user1_id, user2_id, status) VALUES (?, ?, ?)').run(user1_id, user2_id, status);
    
    if (status === 'matched') {
      // Check if user2 also liked user1
      const reverseMatch = db.prepare("SELECT * FROM matches WHERE user1_id = ? AND user2_id = ? AND status = 'matched'").get(user2_id, user1_id);
      if (reverseMatch) {
        return res.json({ match: true });
      }
    }
    res.json({ match: false });
  });

  // Chat
  app.get('/api/messages/:user1/:user2', (req, res) => {
    const { user1, user2 } = req.params;
    const messages = db.prepare(`
      SELECT * FROM messages 
      WHERE (sender_id = ? AND receiver_id = ?) 
      OR (sender_id = ? AND receiver_id = ?)
      ORDER BY created_at ASC
    `).all(user1, user2, user2, user1);
    res.json(messages);
  });

  app.get('/api/chat/counts/:userId', (req, res) => {
    const userId = req.params.userId;
    try {
      const unreadCount = db.prepare('SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0').get(userId).count;
      const groupCount = db.prepare('SELECT COUNT(*) as count FROM user_groups WHERE user_id = ?').get(userId).count;
      const favoritesCount = db.prepare('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?').get(userId).count;
      res.json({ unread: unreadCount, groups: groupCount, favorites: favoritesCount });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch counts' });
    }
  });

  app.get('/api/users', (req, res) => {
    const users = db.prepare('SELECT id, username, avatar_url, bio, location, points, level FROM users WHERE is_banned = 0').all();
    res.json(users);
  });

  // Admin
  app.get('/api/admin/stats', (req, res) => {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const postCount = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;
    res.json({ userCount, postCount });
  });

  // --- SOCKET.IO ---
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', (userId) => {
      socket.join(`user_${userId}`);
    });

    socket.on('send_message', (data) => {
      const { sender_id, receiver_id, content } = data;
      db.prepare('INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)').run(sender_id, receiver_id, content);
      io.to(`user_${receiver_id}`).emit('receive_message', data);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`STYN Server running on http://localhost:${PORT}`);
  });
}

startServer();
