import { describe, expect, it, mock, beforeEach, afterEach } from "bun:test";
import { NotificationService } from "../services/notification.service";
import { EmailService } from "../services/email.service";

// Mock EmailService methods
mock.module("../services/email.service", () => {
  return {
    EmailService: {
      sendEmail: mock(() => Promise.resolve(true)),
      getEmailLayout: mock((title: string, contentHtml: string) => `<html><head><title>${title}</title></head><body>${contentHtml}</body></html>`),
      sendVerificationEmail: mock(),
      sendPasswordResetEmail: mock(),
    }
  };
});

describe("NotificationService", () => {
  beforeEach(() => {
    (EmailService.sendEmail as any).mockClear();
    (EmailService.getEmailLayout as any).mockClear();
  });

  afterEach(() => {
    mock.restore();
  });

  describe("sendNewCommentEmail", () => {
    it("should format email correctly and include moderation link when originUrl is provided", async () => {
      await NotificationService.sendNewCommentEmail(
        "owner@test.com",
        "John <Script> Doe",
        "john@test.com",
        "My Awesome Thread",
        "Hello! <script>alert(1)</script>",
        "https://example.com/post/1"
      );

      expect(EmailService.getEmailLayout).toHaveBeenCalled();
      const layoutArgs = (EmailService.getEmailLayout as any).mock.calls[0];
      expect(layoutArgs[0]).toBe("New comment on My Awesome Thread");
      
      const contentHtml = layoutArgs[1];
      // HTML escaping check
      expect(contentHtml).toContain("John &lt;Script&gt; Doe");
      expect(contentHtml).toContain("Hello! &lt;script&gt;alert(1)&lt;/script&gt;");
      
      // Check moderation link and origin
      expect(contentHtml).toContain("Moderate Comment");
      expect(contentHtml).toContain("https://example.com/post/1");

      expect(EmailService.sendEmail).toHaveBeenCalledWith(
        "owner@test.com",
        "New comment on My Awesome Thread",
        expect.any(String)
      );
    });

    it("should not include moderation link when originUrl is absent", async () => {
      await NotificationService.sendNewCommentEmail(
        "owner@test.com",
        "Jane Doe",
        "jane@test.com",
        "Another Thread",
        "Nice post!"
      );

      const contentHtml = (EmailService.getEmailLayout as any).mock.calls[0][1];
      expect(contentHtml).not.toContain("Moderate Comment");
      expect(contentHtml).toContain("Jane Doe");
    });
  });

  describe("sendReplyEmail", () => {
    it("should format email correctly and include discussion link when originUrl is provided", async () => {
      await NotificationService.sendReplyEmail(
        "parent@test.com",
        "Parent <Name>",
        "Replier",
        "reply@test.com",
        "The Thread",
        "I agree with you! &",
        "https://example.com/post/2"
      );

      const layoutArgs = (EmailService.getEmailLayout as any).mock.calls[0];
      expect(layoutArgs[0]).toBe("Replier replied to your comment on The Thread");
      
      const contentHtml = layoutArgs[1];
      // HTML escaping check
      expect(contentHtml).toContain("Parent &lt;Name&gt;");
      expect(contentHtml).toContain("I agree with you! &amp;");
      
      // Check discussion link
      expect(contentHtml).toContain("View Discussion");
      expect(contentHtml).toContain("https://example.com/post/2");

      expect(EmailService.sendEmail).toHaveBeenCalledWith(
        "parent@test.com",
        "Replier replied to your comment on The Thread",
        expect.any(String)
      );
    });

    it("should not include discussion link when originUrl is absent", async () => {
      // NotificationService expects originUrl as string, but passing empty string simulates absence
      await NotificationService.sendReplyEmail(
        "parent@test.com",
        "Parent Name",
        "Replier",
        "reply@test.com",
        "The Thread",
        "I agree",
        ""
      );

      const contentHtml = (EmailService.getEmailLayout as any).mock.calls[0][1];
      expect(contentHtml).not.toContain("View Discussion");
    });
  });
});
