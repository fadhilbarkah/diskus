import { Resend } from 'resend';
import { escapeHtmlEntities } from '../utils/html';

export class NotificationService {
  static async sendNewCommentEmail(
    apiKey: string | null | undefined,
    senderEmailConfig: string | null | undefined,
    ownerEmail: string,
    authorName: string,
    authorEmail: string,
    threadTitle: string,
    content: string
  ) {
    if (!apiKey) return;

    try {
      const resend = new Resend(apiKey);
      const senderEmail = senderEmailConfig || process.env.RESEND_SENDER_EMAIL || 'onboarding@resend.dev';
      
      await resend.emails.send({
        from: `Diskus <${senderEmail}>`,
        to: ownerEmail,
        subject: `New comment on ${threadTitle}`,
        html: `
          <h2>New Comment from ${escapeHtmlEntities(authorName)}</h2>
          <p><strong>Thread:</strong> ${escapeHtmlEntities(threadTitle)}</p>
          <p><strong>Email:</strong> ${escapeHtmlEntities(authorEmail)}</p>
          <br />
          <div>${escapeHtmlEntities(content)}</div>
        `,
      });
    } catch (err) {
      console.error('Failed to send email notification:', err);
    }
  }
}
