
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { pool } from "./config/database.js";

const app = express();

app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));

app.use(express.json());

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      success: true,
      message: "Backend and PostgreSQL are connected."
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed."
    });
  }
});

const port = Number(process.env.PORT || 5000);

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});
