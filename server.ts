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

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    from_user_id INTEGER,
    type TEXT, -- 'match', 'message', 'like', 'view'
    content TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(from_user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT
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
  const user = db.prepare("SELECT id, full_name, username, age, gender, location, bio, photos, cover_photo, verification_status, premium_type, last_seen, followers_count, following_count, points, level, relationship_status FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

app.put("/api/profile/update", authenticateToken, (req: any, res) => {
  const { full_name, bio, location, gender, interested_in, age, photos, cover_photo, relationship_status } = req.body;
  db.prepare(`
    UPDATE users 
    SET full_name = ?, bio = ?, location = ?, gender = ?, interested_in = ?, age = ?, photos = ?, cover_photo = ?, relationship_status = ?
    WHERE id = ?
  `).run(full_name, bio, location, gender, interested_in, age, photos, cover_photo, relationship_status, req.user.id);
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  res.json(user);
});

app.post("/api/follow", authenticateToken, (req: any, res) => {
  const { following_id } = req.body;
  const follower_id = req.user.id;
  try {
    db.prepare("INSERT INTO follows (follower_id, following_id) VALUES (?, ?)").run(follower_id, following_id);
    db.prepare("UPDATE users SET following_count = following_count + 1 WHERE id = ?").run(follower_id);
    db.prepare("UPDATE users SET followers_count = followers_count + 1 WHERE id = ?").run(following_id);
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

// Admin
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
    SELECT posts.*, users.username, users.photos as user_photos, users.verification_status
    FROM posts
    JOIN users ON posts.user_id = users.id
    WHERE posts.is_deleted = 0
    ORDER BY 
      CASE WHEN users.verification_status = 'verified' THEN 0 ELSE 1 END,
      posts.created_at DESC
    LIMIT 50
  `).all();
  res.json(posts);
});

app.post("/api/posts", authenticateToken, (req: any, res) => {
  const { content, media_url, type } = req.body;
  const info = db.prepare("INSERT INTO posts (user_id, content, media_url, type) VALUES (?, ?, ?, ?)").run(req.user.id, content, media_url, type || 'post');
  
  // Award points for posting
  db.prepare("UPDATE users SET points = points + 5 WHERE id = ?").run(req.user.id);
  
  const post = db.prepare(`
    SELECT posts.*, users.username, users.photos as user_photos, users.verification_status
    FROM posts
    JOIN users ON posts.user_id = users.id
    WHERE posts.id = ?
  `).get(info.lastInsertRowid);
  res.json(post);
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
