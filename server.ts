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

  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT,
    source TEXT,
    image_url TEXT,
    location TEXT, -- 'South Africa', 'Zimbabwe'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// --- SEED DATA ---
const seedData = () => {
  const superAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get('styn@styni.com');
  let adminId: number | bigint = 0;
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
    adminId = info.lastInsertRowid;
  } else {
    adminId = superAdmin.id;
  }

  // Add some reels for Super Admin
  const reelCount = db.prepare('SELECT COUNT(*) as count FROM posts WHERE type = "reel"').get().count;
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
  const saProfilesCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE location LIKE "%South Africa%"').get().count;
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
    const type = req.query.type;
    let query = `
      SELECT posts.*, users.username, users.avatar_url 
      FROM posts 
      JOIN users ON posts.user_id = users.id 
    `;
    if (type) {
      query += ` WHERE posts.type = ?`;
    }
    query += ` ORDER BY posts.created_at DESC`;
    
    const posts = type ? db.prepare(query).all(type) : db.prepare(query).all();
    
    // Add comments and like status for each post
    const postsWithDetails = posts.map(post => {
      const comments = db.prepare('SELECT comments.*, users.username, users.avatar_url FROM comments JOIN users ON comments.user_id = users.id WHERE post_id = ? ORDER BY created_at ASC').all(post.id);
      const likes = db.prepare('SELECT COUNT(*) as count FROM likes WHERE post_id = ?').get(post.id).count;
      return { ...post, comments, likes_count: likes };
    });
    
    res.json(postsWithDetails);
  });

  app.post('/api/posts/like', (req, res) => {
    const { user_id, post_id } = req.body;
    try {
      const existing = db.prepare('SELECT * FROM likes WHERE user_id = ? AND post_id = ?').get(user_id, post_id);
      if (existing) {
        db.prepare('DELETE FROM likes WHERE user_id = ? AND post_id = ?').run(user_id, post_id);
        res.json({ liked: false });
      } else {
        db.prepare('INSERT INTO likes (user_id, post_id) VALUES (?, ?)').run(user_id, post_id);
        res.json({ liked: true });
      }
    } catch (err) {
      res.status(400).json({ error: 'Action failed' });
    }
  });

  app.post('/api/posts/comment', (req, res) => {
    const { user_id, post_id, content } = req.body;
    try {
      db.prepare('INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)').run(user_id, post_id, content);
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
