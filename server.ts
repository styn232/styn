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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

// Users
app.get("/api/users", authenticateToken, (req: any, res) => {
  const users = db.prepare("SELECT id, full_name, username, age, gender, location, bio, photos, verification_status, premium_type, last_seen FROM users WHERE id != ? AND is_banned = 0").all(req.user.id);
  res.json(users);
});

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

// Feed
app.get("/api/posts", (req, res) => {
  const posts = db.prepare(`
    SELECT posts.*, users.username, users.photos as user_photos
    FROM posts
    JOIN users ON posts.user_id = users.id
    WHERE posts.is_deleted = 0
    ORDER BY posts.created_at DESC
    LIMIT 50
  `).all();
  res.json(posts);
});

app.post("/api/posts", authenticateToken, (req: any, res) => {
  const { content, media_url, type } = req.body;
  const info = db.prepare("INSERT INTO posts (user_id, content, media_url, type) VALUES (?, ?, ?, ?)").run(req.user.id, content, media_url, type || 'post');
  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(info.lastInsertRowid);
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
