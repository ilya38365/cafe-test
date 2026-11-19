import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });

export const config = {
  port: Number(process.env.PORT || 4000),
  adminPassword: process.env.ADMIN_PASSWORD || "",
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || "",
  jwtSecret: process.env.JWT_SECRET || "cafe-demo-change-me-in-production",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  whatsappNumber: String(process.env.WHATSAPP_NUMBER || "77054576615").replace(/\D/g, ""),
  uploadsDir: join(__dirname, process.env.UPLOADS_DIR || "uploads"),
  dbPath: join(__dirname, process.env.DB_PATH || "cafe.sqlite"),
};
