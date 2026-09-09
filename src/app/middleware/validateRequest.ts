import type { NextFunction, Request, Response } from "express";
import type { ZodObject } from "zod";

const validateRequest =
  (schema: ZodObject) => async (req: Request, _res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
      });
      return next();
    } catch (err) {
      next(err);
    }
  };

export default validateRequest;
