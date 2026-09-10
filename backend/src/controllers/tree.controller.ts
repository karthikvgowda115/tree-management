import { Request, Response, NextFunction } from "express";
import {
  getRootTree,
  getNodeChildren,
  searchTree,
  moveTreeNode,
} from "../services/tree.service";

export async function getRoot(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const nodes = await getRootTree();

    res.status(200).json({
      success: true,
      data: nodes,
    });
  } catch (error) {
    next(error);
  }
}

export async function getChildren(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parentId = Number(req.params.parentId);

    if (Number.isNaN(parentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid parent ID",
      });
    }

    const nodes = await getNodeChildren(parentId);

    res.status(200).json({
      success: true,
      data: nodes,
    });
  } catch (error) {
    next(error);
  }
}

export async function search(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const query = String(req.query.q || "").trim();

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const nodes = await searchTree(query);

    res.status(200).json({
      success: true,
      data: nodes,
    });
  } catch (error) {
    next(error);
  }
}

export async function move(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const nodeId = Number(req.params.nodeId);
    const { newParentId } = req.body;

    if (Number.isNaN(nodeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid node ID",
      });
    }

    if (
      newParentId !== null &&
      newParentId !== undefined &&
      Number.isNaN(Number(newParentId))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid new parent ID",
      });
    }

    const parentId =
      newParentId === null || newParentId === undefined
        ? null
        : Number(newParentId);

    const node = await moveTreeNode(nodeId, parentId);

    res.status(200).json({
      success: true,
      message: "Node moved successfully",
      data: node,
    });
  } catch (error) {
    next(error);
  }
}