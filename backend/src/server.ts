import dotenv from "dotenv";
import app from "./app";
import pool from "./config/database";

dotenv.config();

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    await pool.query("SELECT NOW()");

    console.log("PostgreSQL connected");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("PostgreSQL connection failed:", error);
    process.exit(1);
  }
}

startServer();