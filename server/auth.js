import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "./config.js";

export function verifyAdminPassword(password) {
  const value = String(password || "");
  if (config.adminPasswordHash) {
    return bcrypt.compareSync(value, config.adminPasswordHash);
  }
  // fallback for local demo only
  return value.length > 0 && value === config.adminPassword;
}

export function signAdminToken() {
  return jwt.sign({ role: "admin" }, config.jwtSecret, { expiresIn: "8h" });
}

export function verifyAdminToken(token) {
  const payload = jwt.verify(token, config.jwtSecret);
  if (payload.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return payload;
}

export function assertSecureConfig() {
  const weakSecrets = [
    "cafe-demo-change-me-in-production",
    "change-me",
    "change-this-to-a-long-random-string",
  ];
  const weakPasswords = ["admin123", "1234", "password", "admin"];

  if (weakSecrets.includes(config.jwtSecret) || config.jwtSecret.length < 32) {
    console.warn(
      "[security] JWT_SECRET слишком слабый. Сгенерируйте длинный случайный секрет в .env",
    );
  }
  if (!config.adminPasswordHash && weakPasswords.includes(config.adminPassword)) {
    console.warn(
      "[security] ADMIN_PASSWORD слишком простой. Задайте сложный пароль или ADMIN_PASSWORD_HASH",
    );
  }
}
