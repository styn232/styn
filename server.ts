import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('styn.db');

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
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
    age INTEGER,
    gender TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Add columns if they don't exist (for existing databases)
  PRAGMA foreign_keys=off;
  BEGIN TRANSACTION;
  CREATE TABLE IF NOT EXISTS users_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
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
    age INTEGER,
    gender TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  INSERT OR IGNORE INTO users_new (id, username, email, password, phone, bio, location, avatar_url, interests, points, level, is_super_admin, created_at)
  SELECT id, username, email, password, phone, bio, location, avatar_url, interests, points, level, is_super_admin, created_at FROM users;
  DROP TABLE users;
  ALTER TABLE users_new RENAME TO users;
  COMMIT;
  PRAGMA foreign_keys=on;

  CREATE TABLE IF NOT EXISTS ads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT,
    image_url TEXT,
    link_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    content TEXT,
    media_url TEXT,
    type TEXT, -- 'post', 'reel', 'blockbuster'
    likes_count INTEGER DEFAULT 0,
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
    activity_type TEXT, -- 'like', 'comment', 'reel_view', 'post_view'
    target_id INTEGER, -- post_id or reel_id
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS match_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER,
    success_score INTEGER DEFAULT 0, -- 0 to 100, based on chat length/engagement
    FOREIGN KEY(match_id) REFERENCES matches(id)
  );
`);

// --- SEED DATA ---
const seedData = () => {
  const superAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get('styn@styni.com');
  if (!superAdmin) {
    const info = db.prepare(`
      INSERT INTO users (username, email, password, is_super_admin, bio, avatar_url, interests) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'SuperAdmin', 
      'styn@styni.com', 
      'chiminya', 
      1, 
      'The official STYN Super Administrator.', 
      'https://picsum.photos/seed/admin/200/200',
      'Technology, Management, Innovation'
    );
    const adminId = info.lastInsertRowid;

    // Add some reels for Super Admin
    db.prepare('INSERT INTO posts (user_id, content, media_url, type) VALUES (?, ?, ?, ?)').run(
      adminId,
      'Welcome to the future of STYN! 🚀',
      'https://picsum.photos/seed/reel_admin1/1080/1920',
      'reel'
    );
    db.prepare('INSERT INTO posts (user_id, content, media_url, type) VALUES (?, ?, ?, ?)').run(
      adminId,
      'Our mission is to connect the world through creativity.',
      'https://picsum.photos/seed/reel_admin2/1080/1920',
      'reel'
    );
  }

  // Seed 5 Dating Profiles
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount < 6) {
    const datingProfiles = [
      ['Sarah J.', 'sarah@example.com', 'Art, Travel, Photography', 'Adventure seeker and coffee lover.'],
      ['Mike Ross', 'mike@example.com', 'Gaming, Tech, Music', 'Building the future, one line at a time.'],
      ['Elena V.', 'elena@example.com', 'Yoga, Fitness, Healthy Food', 'Finding balance in a chaotic world.'],
      ['David K.', 'david@example.com', 'Cooking, Wine, Movies', 'Foodie at heart, looking for a dinner partner.'],
      ['Sophia L.', 'sophia@example.com', 'Books, Writing, Nature', 'Lost in a good book or a deep forest.']
    ];

    datingProfiles.forEach(([username, email, interests, bio]) => {
      db.prepare(`
        INSERT INTO users (username, email, password, interests, bio, avatar_url) 
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        username, 
        email, 
        'password123', 
        interests, 
        bio, 
        `https://picsum.photos/seed/${username.replace(' ', '')}/200/200`
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

  // --- API ROUTES ---

  // Auth (Mock for MVP)
  app.post('/api/auth/signup', (req, res) => {
    const { username, email, password } = req.body;
    try {
      const info = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)').run(username, email, password);
      res.json({ id: info.lastInsertRowid, username, email });
    } catch (err) {
      res.status(400).json({ error: 'User already exists' });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND password = ?').get(email, password);
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  // User Profile & Social
  app.put('/api/profile', (req, res) => {
    const { id, username, bio, avatar_url, interests, age, gender, location } = req.body;
    try {
      db.prepare('UPDATE users SET username = ?, bio = ?, avatar_url = ?, interests = ?, age = ?, gender = ?, location = ? WHERE id = ?').run(username, bio, avatar_url, interests, age, gender, location, id);
      const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      res.json(updatedUser);
    } catch (err) {
      res.status(400).json({ error: 'Failed to update profile' });
    }
  });

  app.post('/api/follow', (req, res) => {
    const { follower_id, following_id } = req.body;
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
    const ads = db.prepare('SELECT * FROM ads WHERE is_active = 1 ORDER BY RANDOM() LIMIT 1').all();
    res.json(ads);
  });

  app.post('/api/admin/set-super-admin', (req, res) => {
    const { user_id, is_admin } = req.body;
    db.prepare('UPDATE users SET is_super_admin = ? WHERE id = ?').run(is_admin ? 1 : 0, user_id);
    res.json({ success: true });
  });

  // Posts & Reels
  app.get('/api/posts', (req, res) => {
    const type = req.query.type || 'post';
    const posts = db.prepare(`
      SELECT posts.*, users.username, users.avatar_url 
      FROM posts 
      JOIN users ON posts.user_id = users.id 
      WHERE posts.type = ? 
      ORDER BY posts.created_at DESC
    `).all(type);
    res.json(posts);
  });

  app.post('/api/posts', (req, res) => {
    const { user_id, content, media_url, type } = req.body;
    const info = db.prepare('INSERT INTO posts (user_id, content, media_url, type) VALUES (?, ?, ?, ?)').run(user_id, content, media_url, type);
    
    // Reward points
    db.prepare('UPDATE users SET points = points + 10 WHERE id = ?').run(user_id);
    
    res.json({ id: info.lastInsertRowid });
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
      const reverseMatch = db.prepare('SELECT * FROM matches WHERE user1_id = ? AND user2_id = ? AND status = "matched"').get(user2_id, user1_id);
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

  app.get('/api/users', (req, res) => {
    const users = db.prepare('SELECT id, username, avatar_url, bio FROM users').all();
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
