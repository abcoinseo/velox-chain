import fs from "fs";
import path from "path";

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

export function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

export function readJSON(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf-8");
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

export function writeJSON(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function nowISO() {
  return new Date().toISOString();
}

export function randId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

export function safeCollectionName(name) {
  // allow a-z A-Z 0-9 _ -
  if (!/^[a-zA-Z0-9_-]{1,40}$/.test(name)) return null;
  return name;
}
