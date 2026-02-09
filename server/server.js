import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import {
  DATA_DIR,
  ensureDir,
  readJSON,
  writeJSON,
  nowISO,
  randId,
  safeCollectionName
} from "./storage.js";
import { requireUser, requireProject, getUsers, getProjects } from "./auth.js";

const app = express();

// ---------- Security & middleware ----------
app.use(helmet());
app.use(cors({ origin: "*" })); // later: restrict domains
app.use(express.json({ limit: "1mb" }));
app.use(morgan("combined"));

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false
  })
);

// ---------- Storage init ----------
ensureDir(DATA_DIR);
const USERS_FILE = path.join(DATA_DIR, "users.json");
const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");
const DB_DIR = path.join(DATA_DIR, "db");
ensureDir(DB_DIR);

function saveUsers(users) {
  writeJSON(USERS_FILE, users);
}
function saveProjects(projects) {
  writeJSON(PROJECTS_FILE, projects);
}

function projectFolder(projectId) {
  const pdir = path.join(DB_DIR, projectId);
  ensureDir(pdir);
  return pdir;
}

function collectionFile(projectId, collection) {
  return path.join(projectFolder(projectId), `${collection}.json`);
}

// ---------- Health ----------
app.get("/", (req, res) => {
  res.json({ ok: true, name: "ABDB (File-based Firebase-like API)", time: nowISO() });
});

// ---------- Auth (simple) ----------
// NOTE: This is a simple token system for MVP. For production use real password hashing + JWT.
app.post("/v1/auth/signup", (req, res) => {
  const { username } = req.body || {};
  if (!username || typeof username !== "string" || username.length < 3) {
    return res.status(400).json({ error: "username required (min 3 chars)" });
  }

  const users = getUsers();
  if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ error: "username already exists" });
  }

  const user = {
    id: randId("user"),
    username,
    token: randId("usrToken"),
    createdAt: nowISO()
  };
  users.push(user);
  saveUsers(users);

  res.json({ userId: user.id, token: user.token });
});

app.post("/v1/auth/login", (req, res) => {
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: "username required" });

  const users = getUsers();
  const user = users.find(u => u.username.toLowerCase() === String(username).toLowerCase());
  if (!user) return res.status(404).json({ error: "user not found" });

  // returns existing token
  res.json({ userId: user.id, token: user.token });
});

// ---------- Projects ----------
app.post("/v1/projects/create", requireUser, (req, res) => {
  const { name } = req.body || {};
  const projectName = (name && String(name).slice(0, 50)) || "My Project";

  const projects = getProjects();
  const project = {
    id: randId("proj"),
    ownerId: req.user.id,
    name: projectName,
    apiKey: randId("ABDB_KEY"),
    createdAt: nowISO()
  };

  projects.push(project);
  saveProjects(projects);
  projectFolder(project.id);

  res.json({ projectId: project.id, apiKey: project.apiKey, name: project.name });
});

app.get("/v1/projects", requireUser, (req, res) => {
  const projects = getProjects().filter(p => p.ownerId === req.user.id);
  res.json({ projects });
});

// ---------- Database (Firebase-like) ----------
// List collections (by reading files in project dir)
app.get("/v1/db", requireProject, async (req, res) => {
  const dir = projectFolder(req.project.id);
  const fs = await import("fs");
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
  const collections = files.map(f => f.replace(".json", ""));
  res.json({ projectId: req.project.id, collections });
});

// Create doc
app.post("/v1/db/:collection", requireProject, (req, res) => {
  const collection = safeCollectionName(req.params.collection);
  if (!collection) return res.status(400).json({ error: "Invalid collection name" });

  const file = collectionFile(req.project.id, collection);
  const docs = readJSON(file, []);

  const doc = {
    id: randId("doc"),
    createdAt: nowISO(),
    updatedAt: nowISO(),
    data: req.body ?? {}
  };

  docs.push(doc);
  writeJSON(file, docs);

  res.json({ ok: true, doc });
});

// Get all docs (simple)
app.get("/v1/db/:collection", requireProject, (req, res) => {
  const collection = safeCollectionName(req.params.collection);
  if (!collection) return res.status(400).json({ error: "Invalid collection name" });

  const file = collectionFile(req.project.id, collection);
  const docs = readJSON(file, []);
  res.json({ ok: true, items: docs });
});

// Get one doc
app.get("/v1/db/:collection/:id", requireProject, (req, res) => {
  const collection = safeCollectionName(req.params.collection);
  if (!collection) return res.status(400).json({ error: "Invalid collection name" });

  const file = collectionFile(req.project.id, collection);
  const docs = readJSON(file, []);
  const doc = docs.find(d => d.id === req.params.id);

  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true, doc });
});

// Update (merge)
app.patch("/v1/db/:collection/:id", requireProject, (req, res) => {
  const collection = safeCollectionName(req.params.collection);
  if (!collection) return res.status(400).json({ error: "Invalid collection name" });

  const file = collectionFile(req.project.id, collection);
  const docs = readJSON(file, []);
  const idx = docs.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });

  docs[idx] = {
    ...docs[idx],
    updatedAt: nowISO(),
    data: { ...(docs[idx].data || {}), ...(req.body || {}) }
  };

  writeJSON(file, docs);
  res.json({ ok: true, doc: docs[idx] });
});

// Delete
app.delete("/v1/db/:collection/:id", requireProject, (req, res) => {
  const collection = safeCollectionName(req.params.collection);
  if (!collection) return res.status(400).json({ error: "Invalid collection name" });

  const file = collectionFile(req.project.id, collection);
  const docs = readJSON(file, []);
  const filtered = docs.filter(d => d.id !== req.params.id);

  if (filtered.length === docs.length) return res.status(404).json({ error: "Not found" });
  writeJSON(file, filtered);

  res.json({ ok: true });
});

// ---------- Serve frontend ----------
const WEB_DIR = path.join(process.cwd(), "..", "web");
app.use("/web", express.static(WEB_DIR));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`ABDB running on port ${PORT}`);
  console.log(`DATA_DIR = ${DATA_DIR}`);
});
