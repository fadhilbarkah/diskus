import { Hono } from "hono";
import { z } from "zod";
import { WidgetController } from "../controllers/widget.controller";
import { type AuthVariables, authMiddleware, optionalAuthMiddleware } from "../middlewares/auth";
import { rateLimitMiddleware } from "../middlewares/ratelimit";
import { validate } from "../utils/validator";

const widgetRoutes = new Hono<{ Variables: AuthVariables }>();

widgetRoutes.post(
  "/auth/register",
  rateLimitMiddleware(5, 60 * 60 * 1000), // Max 5 registrations per IP per hour
  validate(
    "json",
    z.object({
      email: z.string().email().max(255),
      name: z.string().min(2).max(100),
      password: z.string().min(6).max(128),
      origin_url: z.string().url().max(1000).optional(),
      _diskus_trap: z.string().max(500).optional(),
    }),
  ),
  WidgetController.register,
);

widgetRoutes.post(
  "/auth/resend-verification",
  authMiddleware,
  rateLimitMiddleware(3, 60 * 60 * 1000),
  validate("json", z.object({ origin_url: z.string().url().max(1000) })),
  WidgetController.resendVerification,
);

widgetRoutes.get("/auth/verify-email", WidgetController.verifyEmail);

widgetRoutes.post(
  "/auth/forgot-password",
  rateLimitMiddleware(3, 60 * 60 * 1000),
  validate(
    "json",
    z.object({ email: z.string().email().max(255), origin_url: z.string().url().max(1000) }),
  ),
  WidgetController.forgotPassword,
);

widgetRoutes.get(
  "/auth/reset-password/validate",
  validate("query", z.object({ token: z.string().max(500) })),
  WidgetController.validateResetPasswordToken,
);

widgetRoutes.post(
  "/auth/reset-password",
  rateLimitMiddleware(5, 60 * 60 * 1000),
  validate(
    "json",
    z.object({ token: z.string().max(500), newPassword: z.string().min(6).max(128) }),
  ),
  WidgetController.resetPassword,
);

widgetRoutes.post(
  "/auth/set-password",
  authMiddleware,
  rateLimitMiddleware(5, 60 * 60 * 1000),
  validate("json", z.object({ newPassword: z.string().min(6).max(128) })),
  WidgetController.setPassword,
);

widgetRoutes.post(
  "/auth/login",
  rateLimitMiddleware(10, 15 * 60 * 1000), // Max 10 login attempts per IP per 15 minutes
  validate(
    "json",
    z.object({
      email: z.string().email().max(255),
      password: z.string().max(128),
    }),
  ),
  WidgetController.login,
);

widgetRoutes.get("/auth/me", authMiddleware, WidgetController.getMe);

widgetRoutes.get("/embed-token", WidgetController.getEmbedToken);

widgetRoutes.get("/comments", WidgetController.getComments);

widgetRoutes.post(
  "/comments",
  rateLimitMiddleware(30, 60 * 1000), // Max 30 comments per IP per minute
  optionalAuthMiddleware,
  validate(
    "json",
    z.object({
      api_key: z.string().max(100),
      thread_key: z.string().max(500),
      authorName: z.string().max(100).optional(),
      authorEmail: z.string().email().max(255).optional(),
      content: z.string().min(1).max(10000),
      parentId: z.string().max(100).optional().nullable(),
      origin_url: z.string().url().max(1000).optional(),
      _diskus_trap: z.string().max(500).optional(),
    }),
  ),
  WidgetController.postComment,
);

widgetRoutes.delete("/comments/:id", authMiddleware, WidgetController.deleteComment);

widgetRoutes.patch(
  "/comments/:id/pin",
  authMiddleware,
  validate("json", z.object({ isPinned: z.boolean() })),
  WidgetController.togglePinComment,
);

widgetRoutes.post(
  "/comments/:id/like",
  authMiddleware,
  rateLimitMiddleware(30, 60 * 1000),
  WidgetController.likeComment,
);

widgetRoutes.post(
  "/comments/:id/unlike",
  authMiddleware,
  rateLimitMiddleware(30, 60 * 1000),
  WidgetController.unlikeComment,
);

export default widgetRoutes;
