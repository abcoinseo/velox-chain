import path from "path";
import { DATA_DIR, readJSON } from "./storage.js";

const USERS_FILE = path.join(DATA_DIR, "users.json");
const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");

export function getUsers() {
  return readJSON(USERS_FILE, []);
}
export function getProjects() {
  return readJSON(PROJECTS_FILE, []);
}

export function requireUser(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "Missing user token" });

  const users = getUsers();
  const user = users.find(u => u.token === token);
  if (!user) return res.status(403).json({ error: "Invalid user token" });

  req.user = user;
  next();
}

export function requireProject(req, res, next) {
  const key = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (!key) return res.status(401).json({ error: "Missing project api key" });

  const projects = getProjects();
  const project = projects.find(p => p.apiKey === key);
  if (!project) return res.status(403).json({ error: "Invalid api key" });

  req.project = project;
  next();
}
