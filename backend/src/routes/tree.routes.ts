import { Router } from "express";
import {
  getRoot,
  getChildren,
  search,
  move,
} from "../controllers/tree.controller";

const router = Router();

router.get("/root", getRoot);
router.get("/search", search);
router.patch("/:nodeId/move", move);
router.get("/:parentId/children", getChildren);

export default router;