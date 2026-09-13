import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";

const notFound = (req: Request, res: Response, _next: NextFunction) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: "API NOT FOUND!",
    errors: [
      {
        field: "path",
        message: `Your requested path is not found: ${req.originalUrl}`,
      },
    ],
  });
};

export default notFound;
