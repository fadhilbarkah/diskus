import { escapeHtmlEntities } from "../utils/html";
import { EmailService } from "./email.service";

export class NotificationService {
  static async sendNewCommentEmail(
    ownerEmail: string,
    authorName: string,
    authorEmail: string,
    threadTitle: string,
    content: string,
    originUrl?: string,
  ) {
    const subject = `New comment on ${threadTitle}`;
    const avatarUrl = `https://api.dicebear.com/10.x/thumbs/png?seed=${encodeURIComponent(authorEmail)}`;

    const contentHtml = `
      <div style="text-align: center; margin-bottom: 32px;">
        <img src="${avatarUrl}" width="64" height="64" style="border-radius: 50%; border: 2px solid #f3f4f6; background-color: #f9fafb;" alt="${escapeHtmlEntities(authorName)}" />
        <h2 style="margin: 16px 0 4px 0; font-size: 20px; font-weight: 700; color: #111827; letter-spacing: -0.5px;">${escapeHtmlEntities(authorName)}</h2>
        <p style="margin: 0; color: #6b7280; font-size: 15px;">left a new comment on <strong style="color: #374151; font-weight: 600;">${escapeHtmlEntities(threadTitle)}</strong></p>
      </div>
      
      <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
        <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.6; font-style: italic;">"${escapeHtmlEntities(content)}"</p>
      </div>
      
      ${
        originUrl
          ? `
      <div style="text-align: center;">
        <a href="${process.env.DASHBOARD_ORIGIN || "http://localhost:5173"}/dashboard/moderation" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Moderate Comment</a>
      </div>
      <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 13px; text-align: center;">
        Posted on: <a href="${originUrl}" style="color: #6b7280;">${originUrl}</a>
      </p>
      `
          : ""
      }
    `;

    const finalHtml = EmailService.getEmailLayout(subject, contentHtml);
    await EmailService.sendEmail(ownerEmail, subject, finalHtml);
  }

  static async sendReplyEmail(
    parentEmail: string,
    parentName: string,
    replyAuthorName: string,
    replyAuthorEmail: string,
    threadTitle: string,
    replyContent: string,
    originUrl: string,
  ) {
    const subject = `${replyAuthorName} replied to your comment on ${threadTitle}`;
    const avatarUrl = `https://api.dicebear.com/10.x/thumbs/png?seed=${encodeURIComponent(replyAuthorEmail)}`;

    const contentHtml = `
      <div style="margin-bottom: 32px;">
        <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #111827; letter-spacing: -0.5px;">Hi ${escapeHtmlEntities(parentName)},</h2>
        <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.5;">
          <strong>${escapeHtmlEntities(replyAuthorName)}</strong> just replied to your comment on <strong style="color: #111827;">${escapeHtmlEntities(threadTitle)}</strong>.
        </p>
      </div>
      
      <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 12px; padding: 24px; margin-bottom: 32px; display: flex; gap: 16px;">
        <img src="${avatarUrl}" width="40" height="40" style="border-radius: 50%; border: 1px solid #e5e7eb; background-color: #ffffff; flex-shrink: 0;" alt="${escapeHtmlEntities(replyAuthorName)}" />
        <div>
          <div style="font-weight: 600; color: #111827; font-size: 14px; margin-bottom: 4px;">${escapeHtmlEntities(replyAuthorName)}</div>
          <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.6;">${escapeHtmlEntities(replyContent)}</p>
        </div>
      </div>
      
      ${
        originUrl
          ? `
      <div style="text-align: center;">
        <a href="${originUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">View Discussion</a>
      </div>
      `
          : ""
      }
    `;

    const finalHtml = EmailService.getEmailLayout(subject, contentHtml);
    await EmailService.sendEmail(parentEmail, subject, finalHtml);
  }
}
