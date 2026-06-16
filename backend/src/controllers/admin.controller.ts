import type { Context } from "hono";
import type { AuthVariables } from "../middlewares/auth";
import { AdminService } from "../services/admin.service";
import { AuthService } from "../services/auth.service";
import { signToken } from "../utils/jwt";

/** Mask sensitive API keys — show only last 4 characters */
function _maskApiKey(key: string | null): string {
  if (!key || key.length < 8) return key ? "••••" : "";
  return `••••••••${key.slice(-4)}`;
}

export class AdminController {
  static async getSites(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get("user")!;
    const sites = await AdminService.getUserSites(user.userId);
    return c.json({ sites });
  }

  static async createSite(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get("user")!;
    const { domain } = (c.req as any).valid("json");
    const site = await AdminService.createSite(user.userId, domain);
    return c.json({ success: true, site });
  }

  static async deleteSite(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get("user")!;
    const id = c.req.param("id") as string;
    await AdminService.deleteSite(id, user.userId);
    return c.json({ success: true });
  }

  static async updateSite(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get("user")!;
    const id = c.req.param("id") as string;
    const { requireLogin, enableEmail, commentsLimit, requireModeration, enabledSocialLogins } = (
      c.req as any
    ).valid("json");

    const updateData: any = {};
    if (requireLogin !== undefined) updateData.requireLogin = requireLogin;
    if (enableEmail !== undefined) updateData.enableEmail = enableEmail;
    if (commentsLimit !== undefined) updateData.commentsLimit = commentsLimit;
    if (requireModeration !== undefined) updateData.requireModeration = requireModeration;
    if (enabledSocialLogins !== undefined) updateData.enabledSocialLogins = enabledSocialLogins;

    await AdminService.updateSite(id, user.userId, updateData);
    return c.json({ success: true });
  }

  static async getAnalyticsSummary(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get("user")!;
    const siteId = c.req.query("siteId");
    const summary = await AdminService.getAnalyticsSummary(user.userId, user.role, siteId);
    return c.json(summary);
  }

  static async getComments(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get("user")!;
    const statusFilter = c.req.query("status");
    const siteId = c.req.query("siteId");

    const dbUser = await AdminService.getUserAccount(user.userId);
    const commentsList = await AdminService.getComments(
      user.userId,
      user.role,
      statusFilter,
      siteId,
    );

    const enrichedComments = commentsList.map((comment) => ({
      ...comment,
      isAuthor: dbUser ? comment.authorEmail === dbUser.email : false,
    }));

    return c.json({ comments: enrichedComments });
  }

  static async togglePinComment(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get("user")!;
    const id = c.req.param("id") as string;
    const { isPinned } = (c.req as any).valid("json");

    // Verify the user owns the site this comment belongs to, or is an admin
    if (user.role === "admin") {
      await AdminService.togglePinComment(id, isPinned);
      return c.json({ success: true });
    }

    // For non-admin users, verify ownership
    const isOwner = await AdminService.verifyCommentOwnershipByUser(id, user.userId);
    if (!isOwner) return c.json({ error: "Unauthorized" }, 403);

    await AdminService.togglePinComment(id, isPinned);
    return c.json({ success: true });
  }

  static async updateCommentsBulk(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get("user")!;
    const { ids, status } = (c.req as any).valid("json");
    await AdminService.updateCommentsStatus(ids, status, user.userId, user.role);
    return c.json({ success: true });
  }

  static async deleteCommentsBulk(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get("user")!;
    const { ids } = (c.req as any).valid("json");
    await AdminService.deleteCommentsBulk(ids, user.userId, user.role);
    return c.json({ success: true });
  }

  static async getAccount(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get("user")!;
    const dbUser = await AdminService.getUserAccount(user.userId);
    if (!dbUser) return c.json({ error: "User not found" }, 404);
    return c.json({
      id: dbUser.id,
      name: dbUser.name || "",
      email: dbUser.email,
    });
  }

  static async updateAccount(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get("user")!;
    const { name, email, currentPassword, newPassword } = (c.req as any).valid("json");

    const dbUser = await AdminService.getUserAccount(user.userId);
    if (!dbUser) return c.json({ error: "User not found" }, 404);

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;

    if (newPassword) {
      if (!currentPassword)
        return c.json({ error: "Current password is required to set a new password" }, 400);
      const isPasswordValid = await Bun.password.verify(currentPassword, dbUser.passwordHash);
      if (!isPasswordValid) return c.json({ error: "Incorrect current password" }, 400);
      updateData.passwordHash = await Bun.password.hash(newPassword);
    }

    await AdminService.updateUserAccount(user.userId, dbUser, updateData);

    // If password was changed, increment tokenVersion to invalidate all old tokens
    // Then issue a new token so the current session stays valid
    if (newPassword) {
      const newTokenVersion = await AuthService.incrementTokenVersion(user.userId);
      const newToken = await signToken({
        userId: user.userId,
        email: email || user.email,
        role: user.role,
        name: name || user.name,
        tokenVersion: newTokenVersion,
      });
      return c.json({ success: true, token: newToken });
    }

    return c.json({ success: true });
  }

  static async exportData(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get("user")!;
    const siteId = c.req.param("siteId");
    if (!siteId) return c.json({ error: "Site ID is required" }, 400);

    const data = await AdminService.exportData(user.userId, user.role, siteId);
    if (!data) return c.json({ error: "Site not found" }, 404);

    c.header("Content-Type", "application/json");
    c.header("Content-Disposition", `attachment; filename="diskus-export-${siteId}.json"`);
    return c.json(data);
  }

  static async importData(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get("user")!;
    const siteId = c.req.param("siteId");
    if (!siteId) return c.json({ error: "Site ID is required" }, 400);

    const data = (c.req as any).valid("json");
    const success = await AdminService.importData(user.userId, user.role, siteId, data);
    if (!success) return c.json({ error: "Failed to import" }, 400);
    return c.json({ success: true });
  }

  static async importDisqusData(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get("user")!;
    const siteId = c.req.param("siteId");
    if (!siteId) return c.json({ error: "Site ID is required" }, 400);

    const body = await c.req.parseBody();
    const file = body.file as File;
    if (!file) return c.json({ error: "XML file is required" }, 400);

    let xmlString = "";
    if (file.name.endsWith(".gz")) {
      const { gunzipSync } = await import("node:zlib");
      const buffer = await file.arrayBuffer();
      const decompressed = gunzipSync(Buffer.from(buffer));
      xmlString = decompressed.toString("utf-8");
    } else {
      xmlString = await file.text();
    }

    const success = await AdminService.importDisqusData(user.userId, user.role, siteId, xmlString);
    if (!success) return c.json({ error: "Failed to parse or import Disqus XML" }, 400);
    return c.json({ success: true });
  }

  static async getWidgetUsers(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get("user")!;
    // Only admins can view the full widget users list
    if (user.role !== "admin") {
      return c.json({ error: "Unauthorized. Only admins can view users." }, 403);
    }
    const users = await AdminService.getWidgetUsers();
    return c.json({ users });
  }

  static async deleteWidgetUser(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get("user")!;
    if (user.role !== "admin") {
      return c.json({ error: "Unauthorized. Only admins can delete users." }, 403);
    }

    const id = c.req.param("id");
    if (!id) return c.json({ error: "User ID is required" }, 400);

    await AdminService.deleteWidgetUser(id);
    return c.json({ success: true });
  }
}
