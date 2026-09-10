import { Request, Response, NextFunction } from "express";

export function errorMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(error);

  const message = error.message;

  if (
    message === "Node not found" ||
    message === "New parent not found" ||
    message === "A node cannot be moved inside itself" ||
    message === "A node cannot be moved inside its own descendant"
  ) {
    return res.status(400).json({
      success: false,
      message,
    });
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
}