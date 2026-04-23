#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const prompt = require("prompt-sync")({ sigint: true });

// =========================
// HELPERS (UNCHANGED)
// =========================

const generateSecret = () => crypto.randomBytes(32).toString("hex");

const parseEnv = (content) => {
  const env = {};
  content.split("\n").forEach((line) => {
    const cleaned = line.trim();
    if (!cleaned || cleaned.startsWith("#")) return;
    const [key, ...rest] = line.split("=");
    env[key] = rest.join("=");
  });
  return env;
};

const toEnvString = (obj) =>
  Object.entries(obj)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

const loadEnv = (filePath) =>
  fs.existsSync(filePath)
    ? parseEnv(fs.readFileSync(filePath, "utf-8"))
    : {};

function askRequired(q) {
  let v = "";
  while (!v) {
    v = prompt(q).trim();
    if (!v) console.log("❌ Required field");
  }
  return v;
}

function detectFolder(candidates) {
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

// =========================
// CORE SETUP (YOUR LOGIC WRAPPED)
// =========================

function init(modeOverride = null) {
  const isDocker = fs.existsSync("/.dockerenv");

  console.log("\n⚡ FULL STACK ENV GENERATOR");
  console.log("Detected:", isDocker ? "Docker 🐳" : "Local 💻");

  let mode = modeOverride || prompt("Run mode (docker/local/custom) [auto]: ");
  if (!mode) mode = isDocker ? "docker" : "local";

  const showOutput =
    (prompt("👀 Show output? (y/n) [n]: ") || "n")
      .toLowerCase()
      .startsWith("y");

  // =========================
  // BACKEND
  // =========================

  let backendPath = detectFolder(["backend", "server", "api", "backend-app"]);

  if (!backendPath) {
    console.log("\n⚠️ Backend not found automatically");
    backendPath = askRequired("Enter backend folder path: ");
  } else {
    console.log("📦 Backend detected:", backendPath);
  }

  const backendEnvPath = path.join(backendPath, ".env");
  const existingBackend = loadEnv(backendEnvPath);

  const PORT =
    existingBackend.PORT || prompt("Backend PORT [5000]: ") || "5000";

  const DB_URL =
    existingBackend.DB_URL ||
    (mode === "docker"
      ? "mongodb://mongo:27017/app"
      : prompt("DB_URL [mongodb://localhost:27017/app]: ") ||
        "mongodb://localhost:27017/app");

  const API_URL =
    mode === "docker"
      ? "http://backend:5000"
      : "http://localhost:5000";

  let JWT_SECRET = existingBackend.JWT_SECRET;

  if (!JWT_SECRET) {
    JWT_SECRET =
      prompt("JWT_SECRET (empty = auto-generate): ") || generateSecret();
  }

  const JWT_EXPIRES_IN =
    existingBackend.JWT_EXPIRES_IN ||
    prompt("JWT expiry [1h]: ") ||
    "1h";

  const backendEnv = {
    PORT,
    DB_URL,
    API_URL,
    JWT_SECRET,
    JWT_EXPIRES_IN,
    NODE_ENV: mode === "docker" ? "production" : "development",
  };

  fs.writeFileSync(backendEnvPath, toEnvString(backendEnv));
  console.log("✅ Backend .env created");

  // =========================
  // FRONTEND
  // =========================

  let frontendPath = detectFolder(["frontend", "client", "web", "app"]);

  if (!frontendPath) {
    const add = prompt("Frontend not found. Add manually? (y/n): ");
    if (add.toLowerCase() === "y") {
      frontendPath = askRequired("Frontend folder path: ");
    }
  }

  if (frontendPath) {
    console.log("🌐 Frontend detected:", frontendPath);

    const frontendEnvPath = path.join(frontendPath, ".env");
    const existingFrontend = loadEnv(frontendEnvPath);

    let prefix = "VITE_";

    try {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(frontendPath, "package.json"))
      );

      if (pkg.dependencies?.react) prefix = "REACT_APP_";
      if (pkg.dependencies?.next) prefix = "NEXT_PUBLIC_";
    } catch {}

    let connectMode =
      prompt("Frontend connect (docker/local/custom) [auto]: ") || mode;

    let frontendAPI;

    if (connectMode === "docker") {
      frontendAPI = "http://backend:5000";
    } else if (connectMode === "local") {
      frontendAPI = "http://localhost:5000";
    } else {
      frontendAPI = prompt("Custom API URL: ");
    }

    const frontendEnv = {
      ...existingFrontend,
      [`${prefix}API_URL`]: frontendAPI,
    };

    fs.writeFileSync(frontendEnvPath, toEnvString(frontendEnv));

    const apiPath = path.join(frontendPath, "src/api/client.js");

    fs.mkdirSync(path.dirname(apiPath), { recursive: true });

    const apiCode = `import axios from "axios";

const API_URL = "${frontendAPI}";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});
`;

    fs.writeFileSync(apiPath, apiCode);

    console.log("✅ Frontend configured");

    if (showOutput) {
      console.log("\n📦 FRONTEND OUTPUT:\n");
      console.log(apiCode);
    }
  }

  if (showOutput) {
    console.log("\n🧠 BACKEND OUTPUT:\n");
    console.log(toEnvString(backendEnv));
  }

  console.log("\n🎉 INIT COMPLETE");
}

// =========================
// RESET COMMAND
// =========================

function reset() {
  console.log("\n🧹 RESETTING ENV FILES...\n");

  const targets = [".env", "backend/.env", "frontend/.env"];

  targets.forEach((f) => {
    if (fs.existsSync(f)) {
      fs.unlinkSync(f);
      console.log("Deleted:", f);
    }
  });

  console.log("\n✅ Reset complete");
}

// =========================
// DOCKER COMMAND
// =========================

function docker() {
  console.log("\n🐳 FORCING DOCKER MODE...\n");
  init("docker");
}

// =========================
// ROUTER (NEW COMMAND SYSTEM)
// =========================

const args = process.argv.slice(2);
const command = args[0] || "init";

switch (command) {
  case "init":
    init();
    break;

  case "reset":
    reset();
    break;

  case "docker":
    docker();
    break;

  default:
    console.log("❌ Unknown command");
    console.log("Usage:");
    console.log("  envgen init");
    console.log("  envgen reset");
    console.log("  envgen docker");
}