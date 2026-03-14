import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("styn.db");
const JWT_SECRET = process.env.JWT_SECRET || "styn-enterprise-secret-2026";
const POINTS_TO_MONEY_RATE = 0.001; // 1000 points = $1

// --- DATABASE INITIALIZATION ---
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    phone TEXT,
    password TEXT,
    gender TEXT,
    interested_in TEXT,
    age INTEGER,
    location TEXT,
    bio TEXT,
    interests TEXT,
    photos TEXT, -- JSON array
    video_intro TEXT,
    verification_status TEXT DEFAULT 'pending',
    premium_type TEXT DEFAULT 'free',
    points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    is_super_admin INTEGER DEFAULT 0,
    is_banned INTEGER DEFAULT 0,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    cover_photo TEXT,
    relationship_status TEXT,
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER,
    following_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(follower_id, following_id),
    FOREIGN KEY(follower_id) REFERENCES users(id),
    FOREIGN KEY(following_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    description TEXT,
    price REAL,
    image_url TEXT,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS saved_products (
    user_id INTEGER,
    product_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(user_id, product_id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user1_id INTEGER,
    user2_id INTEGER,
    compatibility_score INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user1_id) REFERENCES users(id),
    FOREIGN KEY(user2_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS swipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    swiper_id INTEGER,
    swiped_id INTEGER,
    type TEXT, -- 'right', 'left', 'super'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(swiper_id) REFERENCES users(id),
    FOREIGN KEY(swiped_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_id INTEGER,
    text TEXT,
    image_url TEXT,
    voice_url TEXT,
    is_seen INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(receiver_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    content TEXT,
    media_url TEXT,
    type TEXT DEFAULT 'post', -- 'post', 'reel'
    likes_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS post_views (
    user_id INTEGER,
    post_id INTEGER,
    PRIMARY KEY(user_id, post_id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(post_id) REFERENCES posts(id)
  );

  CREATE TABLE IF NOT EXISTS withdrawals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    amount REAL,
    status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'rejected'
    payment_method TEXT,
    payment_details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  ALTER TABLE users ADD COLUMN verification_id_url TEXT;
  ALTER TABLE users ADD COLUMN balance REAL DEFAULT 0;

  CREATE TABLE IF NOT EXISTS friend_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_id INTEGER,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(receiver_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  -- Initialize default settings
  INSERT OR IGNORE INTO site_settings (key, value) VALUES ('points_to_money_rate', '0.001');
  INSERT OR IGNORE INTO site_settings (key, value) VALUES ('paypal_client_id', '');
  INSERT OR IGNORE INTO site_settings (key, value) VALUES ('paypal_secret', '');
  INSERT OR IGNORE INTO site_settings (key, value) VALUES ('points_per_post', '10');
  INSERT OR IGNORE INTO site_settings (key, value) VALUES ('points_per_follow', '5');
  INSERT OR IGNORE INTO site_settings (key, value) VALUES ('points_per_like', '2');
  INSERT OR IGNORE INTO site_settings (key, value) VALUES ('points_per_comment', '3');
  INSERT OR IGNORE INTO site_settings (key, value) VALUES ('points_per_view', '1');

  CREATE TABLE IF NOT EXISTS friend_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_id INTEGER,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(receiver_id) REFERENCES users(id)
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

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    from_user_id INTEGER,
    type TEXT, -- 'match', 'message', 'like', 'view', 'friend_request', 'profile_update'
    content TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(from_user_id) REFERENCES users(id)
  );
`);

// --- SEED INITIAL ADMIN ---
const seedAdmin = () => {
  const adminEmail = "jobsatespace@gmail.com";
  const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(adminEmail);
  if (!existing) {
    const hashedPassword = bcrypt.hashSync("admin123", 10);
    db.prepare(`
      INSERT INTO users (full_name, username, email, password, is_super_admin, level, points)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run("STYN Admin", "admin", adminEmail, hashedPassword, 1, 100, 10000);
    console.log("Admin account created: jobsatespace@gmail.com / admin123");
  }
};
seedAdmin();

// --- MIDDLEWARE ---
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// --- FILE UPLOAD CONFIG ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

// Ensure uploads directory exists
import fs from 'fs';
if (!fs.existsSync('public/uploads')) {
  fs.mkdirSync('public/uploads', { recursive: true });
}
app.use('/uploads', express.static('public/uploads'));

// --- HELPERS ---
const getSetting = (key: string, defaultValue: string) => {
  const setting = db.prepare('SELECT value FROM site_settings WHERE key = ?').get(key) as { value: string } | undefined;
  return setting ? setting.value : defaultValue;
};

const updatePoints = (userId: number, points: number) => {
  db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(points, userId);
};

const createNotification = (userId: number, fromId: number, type: string, content: string) => {
  db.prepare('INSERT INTO notifications (user_id, from_user_id, type, content) VALUES (?, ?, ?, ?)').run(userId, fromId, type, content);
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

// --- SOCKET.IO ---
const userSockets = new Map<number, string>();

io.on("connection", (socket) => {
  socket.on("identify", (userId: number) => {
    userSockets.set(userId, socket.id);
    db.prepare("UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?").run(userId);
  });

  socket.on("send_message", (data: { sender_id: number, receiver_id: number, text: string }) => {
    const info = db.prepare(`
      INSERT INTO messages (sender_id, receiver_id, text)
      VALUES (?, ?, ?)
    `).run(data.sender_id, data.receiver_id, data.text);
    
    const message = db.prepare("SELECT * FROM messages WHERE id = ?").get(info.lastInsertRowid);
    
    const receiverSocketId = userSockets.get(data.receiver_id);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receive_message", message);
    }
    socket.emit("message_sent", message);
  });

  socket.on("disconnect", () => {
    for (const [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        break;
      }
    }
  });
});

// --- API ROUTES ---

// File Upload
app.post("/api/upload", authenticateToken, upload.single('file'), (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  
  const isImage = req.file.mimetype.startsWith('image/');
  if (isImage && req.file.size > 2 * 1024 * 1024) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "Image too large. Max 2MB." });
  }

  res.json({ url: `/uploads/${req.file.filename}` });
});

// Auth
app.post("/api/auth/register", (req, res) => {
  const { full_name, username, email, password, gender, interested_in, age } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const info = db.prepare(`
      INSERT INTO users (full_name, username, email, password, gender, interested_in, age)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(full_name, username, email, hashedPassword, gender, interested_in, age);
    
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
    res.json({ user, token });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
  res.json({ user, token });
});

app.post("/api/auth/reset-password", (req, res) => {
  const { email, new_password } = req.body;
  const hashedPassword = bcrypt.hashSync(new_password, 10);
  const result = db.prepare("UPDATE users SET password = ? WHERE email = ?").run(hashedPassword, email);
  if (result.changes > 0) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "User not found" });
  }
});

// Users
app.get("/api/users/discovery", authenticateToken, (req: any, res) => {
  const user: any = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  const users = db.prepare(`
    SELECT id, full_name, username, age, gender, location, bio, photos, verification_status, premium_type, last_seen 
    FROM users 
    WHERE id != ? 
    AND is_banned = 0
    AND gender = ?
    LIMIT 20
  `).all(req.user.id, user.interested_in);
  res.json(users);
});

// Swipes & Matches
app.post("/api/swipe", authenticateToken, (req: any, res) => {
  const { swiped_id, type } = req.body;
  const swiper_id = req.user.id;

  db.prepare("INSERT INTO swipes (swiper_id, swiped_id, type) VALUES (?, ?, ?)").run(swiper_id, swiped_id, type);

  if (type === 'right' || type === 'super') {
    const matchCheck = db.prepare("SELECT * FROM swipes WHERE swiper_id = ? AND swiped_id = ? AND (type = 'right' OR type = 'super')").get(swiped_id, swiper_id);
    if (matchCheck) {
      db.prepare("INSERT INTO matches (user1_id, user2_id, compatibility_score) VALUES (?, ?, ?)").run(swiper_id, swiped_id, 85);
      return res.json({ match: true });
    }
  }
  res.json({ match: false });
});

app.get("/api/matches", authenticateToken, (req: any, res) => {
  const matches = db.prepare(`
    SELECT matches.*, u.full_name, u.username, u.photos, u.last_seen
    FROM matches
    JOIN users u ON (u.id = matches.user1_id OR u.id = matches.user2_id)
    WHERE (matches.user1_id = ? OR matches.user2_id = ?) AND u.id != ?
  `).all(req.user.id, req.user.id, req.user.id);
  res.json(matches);
});
app.get("/api/users", authenticateToken, (req: any, res) => {
  const users = db.prepare("SELECT id, full_name, username, age, gender, location, bio, photos, cover_photo, verification_status, premium_type, last_seen, followers_count, following_count, points, level, relationship_status FROM users WHERE id != ? AND is_banned = 0").all(req.user.id);
  res.json(users);
});

app.get("/api/users/:id", authenticateToken, (req: any, res) => {
  const user = db.prepare("SELECT id, full_name, username, age, gender, location, bio, photos, cover_photo, verification_status, premium_type, last_seen, followers_count, following_count, points, level, relationship_status, balance FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

app.put("/api/profile/update", authenticateToken, (req: any, res) => {
  const { full_name, bio, location, gender, interested_in, age, photos, cover_photo, relationship_status } = req.body;
  const userId = req.user.id;

  const oldUser = db.prepare('SELECT photos, cover_photo FROM users WHERE id = ?').get(userId) as any;

  db.prepare(`
    UPDATE users 
    SET full_name = ?, bio = ?, location = ?, gender = ?, interested_in = ?, age = ?, photos = ?, cover_photo = ?, relationship_status = ?
    WHERE id = ?
  `).run(full_name, bio, location, gender, interested_in, age, photos, cover_photo, relationship_status, userId);

  // Create post if profile picture or cover photo changed
  if (photos && photos !== oldUser.photos) {
    try {
      const photoUrl = JSON.parse(photos)[0];
      db.prepare('INSERT INTO posts (user_id, content, media_url, type) VALUES (?, ?, ?, ?)').run(
        userId, "Updated profile picture", photoUrl, "post"
      );
    } catch (e) {}
  }
  if (cover_photo && cover_photo !== oldUser.cover_photo) {
    db.prepare('INSERT INTO posts (user_id, content, media_url, type) VALUES (?, ?, ?, ?)').run(
      userId, "Updated cover photo", cover_photo, "post"
    );
  }

  // Notify followers
  const followers = db.prepare('SELECT follower_id FROM follows WHERE following_id = ?').all(userId) as any[];
  followers.forEach(f => {
    createNotification(f.follower_id, userId, 'profile_update', `${req.user.username} updated their profile`);
  });

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  res.json(user);
});

app.post("/api/follow", authenticateToken, (req: any, res) => {
  const { following_id } = req.body;
  const follower_id = req.user.id;
  try {
    db.prepare("INSERT INTO follows (follower_id, following_id) VALUES (?, ?)").run(follower_id, following_id);
    db.prepare("UPDATE users SET following_count = following_count + 1 WHERE id = ?").run(follower_id);
    db.prepare("UPDATE users SET followers_count = followers_count + 1 WHERE id = ?").run(following_id);
    
    // Award points for following
    const points = parseInt(getSetting('points_per_follow', '5'));
    updatePoints(follower_id, points);

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "Already following" });
  }
});

app.post("/api/unfollow", authenticateToken, (req: any, res) => {
  const { following_id } = req.body;
  const follower_id = req.user.id;
  db.prepare("DELETE FROM follows WHERE follower_id = ? AND following_id = ?").run(follower_id, following_id);
  db.prepare("UPDATE users SET following_count = following_count - 1 WHERE id = ?").run(follower_id);
  db.prepare("UPDATE users SET followers_count = followers_count - 1 WHERE id = ?").run(following_id);
  res.json({ success: true });
});

// Products / Marketplace
app.get("/api/products", (req, res) => {
  const products = db.prepare(`
    SELECT products.*, users.username, users.photos as user_photos
    FROM products
    JOIN users ON products.user_id = users.id
    ORDER BY products.created_at DESC
  `).all();
  res.json(products);
});

app.post("/api/products", authenticateToken, (req: any, res) => {
  const { name, description, price, image_url, category } = req.body;
  const info = db.prepare("INSERT INTO products (user_id, name, description, price, image_url, category) VALUES (?, ?, ?, ?, ?, ?)").run(req.user.id, name, description, price, image_url, category);
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(info.lastInsertRowid);
  res.json(product);
});

app.post("/api/products/save", authenticateToken, (req: any, res) => {
  const { product_id } = req.body;
  try {
    db.prepare("INSERT INTO saved_products (user_id, product_id) VALUES (?, ?)").run(req.user.id, product_id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "Product already saved" });
  }
});

app.get("/api/products/saved", authenticateToken, (req: any, res) => {
  const products = db.prepare(`
    SELECT products.*, users.username
    FROM products
    JOIN saved_products ON products.id = saved_products.product_id
    JOIN users ON products.user_id = users.id
    WHERE saved_products.user_id = ?
  `).all(req.user.id);
  res.json(products);
});

app.post("/api/withdrawals", authenticateToken, (req: any, res) => {
  const { amount, payment_method, payment_details } = req.body;
  const user: any = db.prepare("SELECT points, balance FROM users WHERE id = ?").get(req.user.id);
  
  const moneyFromPoints = user.points * POINTS_TO_MONEY_RATE;
  const totalAvailable = moneyFromPoints + user.balance;

  if (amount > totalAvailable) {
    return res.status(400).json({ error: "Insufficient funds" });
  }

  // Deduct points first if possible, then balance
  let remainingToDeduct = amount;
  if (moneyFromPoints >= remainingToDeduct) {
    const pointsToDeduct = remainingToDeduct / POINTS_TO_MONEY_RATE;
    db.prepare("UPDATE users SET points = points - ? WHERE id = ?").run(pointsToDeduct, req.user.id);
  } else {
    db.prepare("UPDATE users SET points = 0, balance = balance - ? WHERE id = ?").run(remainingToDeduct - moneyFromPoints, req.user.id);
  }

  db.prepare("INSERT INTO withdrawals (user_id, amount, payment_method, payment_details) VALUES (?, ?, ?, ?)").run(req.user.id, amount, payment_method, payment_details);
  res.json({ success: true });
});

app.get("/api/withdrawals", authenticateToken, (req: any, res) => {
  const withdrawals = db.prepare("SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
  res.json(withdrawals);
});

app.get("/api/admin/withdrawals", authenticateToken, (req: any, res) => {
  const admin: any = db.prepare("SELECT is_super_admin FROM users WHERE id = ?").get(req.user.id);
  if (!admin?.is_super_admin) return res.sendStatus(403);
  const withdrawals = db.prepare(`
    SELECT withdrawals.*, users.username, users.email
    FROM withdrawals
    JOIN users ON withdrawals.user_id = users.id
    ORDER BY created_at DESC
  `).all();
  res.json(withdrawals);
});

app.post("/api/admin/withdrawals/:id/status", authenticateToken, (req: any, res) => {
  const admin: any = db.prepare("SELECT is_super_admin FROM users WHERE id = ?").get(req.user.id);
  if (!admin?.is_super_admin) return res.sendStatus(403);
  const { status } = req.body;
  db.prepare("UPDATE withdrawals SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ success: true });
});

app.post("/api/verify/pay", authenticateToken, (req: any, res) => {
  // Simulate payment success
  db.prepare("UPDATE users SET verification_status = 'verified', points = points + 100 WHERE id = ?").run(req.user.id);
  res.json({ success: true });
});

app.put("/api/admin/users/:id", authenticateToken, (req: any, res) => {
  const admin: any = db.prepare("SELECT is_super_admin FROM users WHERE id = ?").get(req.user.id);
  if (!admin?.is_super_admin) return res.sendStatus(403);

  const { full_name, username, bio, verification_status, premium_type, points, level } = req.body;
  db.prepare(`
    UPDATE users 
    SET full_name = ?, username = ?, bio = ?, verification_status = ?, premium_type = ?, points = ?, level = ?
    WHERE id = ?
  `).run(full_name, username, bio, verification_status, premium_type, points, level, req.params.id);
  res.json({ success: true });
});
app.get("/api/admin/stats", authenticateToken, (req: any, res) => {
  const admin: any = db.prepare("SELECT is_super_admin FROM users WHERE id = ?").get(req.user.id);
  if (!admin?.is_super_admin) return res.sendStatus(403);

  const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
  const totalPosts = db.prepare("SELECT COUNT(*) as count FROM posts").get().count;
  const totalMatches = db.prepare("SELECT COUNT(*) as count FROM matches").get().count;
  const totalProducts = db.prepare("SELECT COUNT(*) as count FROM products").get().count;
  
  const postStats = db.prepare(`
    SELECT type, COUNT(*) as count 
    FROM posts 
    GROUP BY type
  `).all();

  res.json({ totalUsers, totalPosts, totalMatches, totalProducts, postStats });
});

// Feed
app.get("/api/posts", (req, res) => {
  const posts = db.prepare(`
    SELECT posts.*, users.username, users.photos as user_photos, users.verification_status,
    (SELECT COUNT(*) FROM likes WHERE post_id = posts.id) as likes_count,
    (SELECT COUNT(*) FROM comments WHERE post_id = posts.id) as comments_count
    FROM posts
    JOIN users ON posts.user_id = users.id
    WHERE posts.is_deleted = 0
    ORDER BY 
      CASE WHEN users.verification_status = 'verified' THEN 0 ELSE 1 END,
      likes_count DESC,
      posts.created_at DESC
    LIMIT 50
  `).all();
  res.json(posts);
});

app.post("/api/posts", authenticateToken, (req: any, res) => {
  const { content, media_url, type } = req.body;
  const info = db.prepare("INSERT INTO posts (user_id, content, media_url, type) VALUES (?, ?, ?, ?)").run(req.user.id, content, media_url, type || 'post');
  
  // Award points for posting
  const points = parseInt(getSetting('points_per_post', '10'));
  updatePoints(req.user.id, points);
  
  const post = db.prepare(`
    SELECT posts.*, users.username, users.photos as user_photos, users.verification_status, 0 as likes_count, 0 as comments_count
    FROM posts
    JOIN users ON posts.user_id = users.id
    WHERE posts.id = ?
  `).get(info.lastInsertRowid);
  res.json(post);
});

app.put("/api/posts/:id", authenticateToken, (req: any, res) => {
  const { content } = req.body;
  const post = db.prepare("SELECT * FROM posts WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!post) return res.status(403).json({ error: "Unauthorized" });

  db.prepare("UPDATE posts SET content = ? WHERE id = ?").run(content, req.params.id);
  res.json({ success: true });
});

app.post("/api/posts/:id/repost", authenticateToken, (req: any, res) => {
  const originalPost = db.prepare("SELECT * FROM posts WHERE id = ?").get(req.params.id) as any;
  if (!originalPost) return res.status(404).json({ error: "Post not found" });

  const content = `Reposted from @${db.prepare('SELECT username FROM users WHERE id = ?').get(originalPost.user_id).username}: ${originalPost.content}`;
  db.prepare("INSERT INTO posts (user_id, content, media_url, type) VALUES (?, ?, ?, ?)").run(
    req.user.id, content, originalPost.media_url, originalPost.type
  );
  res.json({ success: true });
});

// --- FRIEND REQUESTS ---
app.post("/api/friend-requests", authenticateToken, (req: any, res) => {
  const { receiver_id } = req.body;
  const sender_id = req.user.id;

  try {
    db.prepare('INSERT INTO friend_requests (sender_id, receiver_id) VALUES (?, ?)').run(sender_id, receiver_id);
    createNotification(receiver_id, sender_id, 'friend_request', `${req.user.username} sent you a friend request`);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "Request already exists" });
  }
});

app.post("/api/friend-requests/:id/accept", authenticateToken, (req: any, res) => {
  const requestId = req.params.id;
  const request = db.prepare('SELECT * FROM friend_requests WHERE id = ? AND receiver_id = ?').get(requestId, req.user.id) as any;
  if (!request) return res.status(404).json({ error: "Request not found" });

  db.prepare('UPDATE friend_requests SET status = "accepted" WHERE id = ?').run(requestId);
  
  // Also make them follow each other
  try {
    db.prepare('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)').run(request.sender_id, request.receiver_id);
    db.prepare('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)').run(request.receiver_id, request.sender_id);
  } catch (e) {}

  createNotification(request.sender_id, req.user.id, 'friend_request_accepted', `${req.user.username} accepted your friend request`);
  res.json({ success: true });
});

app.get("/api/friend-requests", authenticateToken, (req: any, res) => {
  const requests = db.prepare(`
    SELECT fr.*, u.username, u.full_name, u.photos
    FROM friend_requests fr
    JOIN users u ON u.id = fr.sender_id
    WHERE fr.receiver_id = ? AND fr.status = 'pending'
  `).all(req.user.id);
  res.json(requests);
});

// --- SUGGESTIONS ---
app.get("/api/users/suggested", authenticateToken, (req: any, res) => {
  const suggested = db.prepare(`
    SELECT id, username, full_name, photos, followers_count
    FROM users
    WHERE id != ? AND id NOT IN (SELECT following_id FROM follows WHERE follower_id = ?)
    ORDER BY followers_count DESC
    LIMIT 5
  `).all(req.user.id, req.user.id);
  res.json(suggested);
});

// --- ADMIN SETTINGS ---
app.get("/api/admin/settings", authenticateToken, (req: any, res) => {
  const admin = db.prepare('SELECT is_super_admin FROM users WHERE id = ?').get(req.user.id) as any;
  if (!admin?.is_super_admin) return res.status(403).json({ error: "Unauthorized" });

  const settings = db.prepare('SELECT * FROM site_settings').all();
  res.json(settings);
});

app.put("/api/admin/settings", authenticateToken, (req: any, res) => {
  const admin = db.prepare('SELECT is_super_admin FROM users WHERE id = ?').get(req.user.id) as any;
  if (!admin?.is_super_admin) return res.status(403).json({ error: "Unauthorized" });

  const { settings } = req.body; // Array of {key, value}
  const stmt = db.prepare('UPDATE site_settings SET value = ? WHERE key = ?');
  const updateMany = db.transaction((items) => {
    for (const item of items) stmt.run(item.value, item.key);
  });
  updateMany(settings);
  res.json({ success: true });
});

app.post("/api/posts/:id/like", authenticateToken, (req: any, res) => {
  const post_id = req.params.id;
  const user_id = req.user.id;
  const existing = db.prepare("SELECT * FROM likes WHERE user_id = ? AND post_id = ?").get(user_id, post_id);
  
  if (existing) {
    db.prepare("DELETE FROM likes WHERE user_id = ? AND post_id = ?").run(user_id, post_id);
    db.prepare("UPDATE posts SET likes_count = likes_count - 1 WHERE id = ?").run(post_id);
    res.json({ liked: false });
  } else {
    db.prepare("INSERT INTO likes (user_id, post_id) VALUES (?, ?)").run(user_id, post_id);
    db.prepare("UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?").run(post_id);
    // Award points for liking
    db.prepare("UPDATE users SET points = points + 1 WHERE id = ?").run(user_id);
    res.json({ liked: true });
  }
});

app.post("/api/posts/:id/view", authenticateToken, (req: any, res) => {
  const post_id = req.params.id;
  const user_id = req.user.id;
  const existing = db.prepare("SELECT * FROM post_views WHERE user_id = ? AND post_id = ?").get(user_id, post_id);
  
  if (!existing) {
    db.prepare("INSERT INTO post_views (user_id, post_id) VALUES (?, ?)").run(user_id, post_id);
    db.prepare("UPDATE posts SET views_count = views_count + 1 WHERE id = ?").run(post_id);
    
    // Award points to the post owner for the view
    const post: any = db.prepare("SELECT user_id FROM posts WHERE id = ?").get(post_id);
    if (post && post.user_id !== user_id) {
      db.prepare("UPDATE users SET points = points + 0.1 WHERE id = ?").run(post.user_id);
    }
  }
  res.json({ success: true });
});

app.get("/api/posts/:id/comments", (req, res) => {
  const comments = db.prepare(`
    SELECT comments.*, users.username, users.photos as user_photos
    FROM comments
    JOIN users ON comments.user_id = users.id
    WHERE post_id = ?
    ORDER BY created_at ASC
  `).all(req.params.id);
  res.json(comments);
});

app.post("/api/posts/:id/comments", authenticateToken, (req: any, res) => {
  const { content } = req.body;
  const post_id = req.params.id;
  const user_id = req.user.id;
  
  const info = db.prepare("INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)").run(post_id, user_id, content);
  
  // Award points for commenting
  db.prepare("UPDATE users SET points = points + 2 WHERE id = ?").run(user_id);

  const comment = db.prepare(`
    SELECT comments.*, users.username, users.photos as user_photos
    FROM comments
    JOIN users ON comments.user_id = users.id
    WHERE comments.id = ?
  `).get(info.lastInsertRowid);
  res.json(comment);
});

// --- VITE MIDDLEWARE ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`STYN Enterprise Platform running on http://localhost:${PORT}`);
  });
}

startServer();
