import express from "express";
import cors from "cors";
import treeRoutes from "./routes/tree.routes";
import { errorMiddleware } from "./middleware/error.middleware";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/tree", treeRoutes);

// Error handling middleware must be registered last
app.use(errorMiddleware);

export default app;