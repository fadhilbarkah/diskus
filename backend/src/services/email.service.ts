import nodemailer from 'nodemailer';

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static getTransporter() {
    if (this.transporter) return this.transporter;

    if (!process.env.SMTP_HOST) {
      console.warn('SMTP_HOST is not configured. Emails will not be sent.');
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    return this.transporter;
  }

  static async sendEmail(to: string, subject: string, html: string) {
    const transporter = this.getTransporter();
    if (!transporter) return false;

    const from = process.env.SMTP_FROM || 'Diskus <noreply@diskus.com>';

    try {
      await transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  static getEmailLayout(title: string, contentHtml: string) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 40px 20px; color: #111827; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 540px; margin: 0 auto;">
    <!-- Logo -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-flex; align-items: center; justify-content: center; gap: 12px;">
        <span style="display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; background-color: #2563eb; color: #ffffff; border-radius: 8px; font-weight: 800; font-size: 20px; line-height: 1;">D</span>
        <span style="color: #2563eb; font-weight: 800; font-size: 26px; letter-spacing: -0.5px; line-height: 1;">Diskus</span>
      </div>
    </div>

    <!-- Main Card -->
    <div style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.05); border: 1px solid #f3f4f6;">
      <div style="padding: 40px;">
        ${contentHtml}
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px; padding: 0 20px;">
      <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">
        Powered by <strong style="color: #374151;">Diskus</strong><br>
        The Modern Commenting Platform
      </p>
      <p style="margin: 12px 0 0 0; font-size: 12px; color: #9ca3af;">
        &copy; ${new Date().getFullYear()} Diskus. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  static async sendVerificationEmail(to: string, name: string, token: string) {
    const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';
    const verifyUrl = `${apiBaseUrl}/widget/auth/verify-email?token=${token}`;

    const contentHtml = `
      <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #111827; letter-spacing: -0.5px;">Verify your email</h2>
      <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
        Hi <strong>${name}</strong>,<br>
        Thanks for joining! Please verify your email address to start participating in the discussions.
      </p>
      <div style="margin: 32px 0; text-align: center;">
        <a href="${verifyUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2); transition: all 0.2s;">Verify Email Address</a>
      </div>
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
      <div style="background-color: #f9fafb; padding: 12px 16px; border-radius: 8px; border: 1px solid #f3f4f6; word-break: break-all;">
        <a href="${verifyUrl}" style="color: #2563eb; font-size: 13px; text-decoration: none;">${verifyUrl}</a>
      </div>
      <p style="margin: 32px 0 0 0; color: #9ca3af; font-size: 13px; text-align: center;">
        If you didn't request this, you can safely ignore this email.
      </p>
    `;

    const finalHtml = this.getEmailLayout('Verify your email address - Diskus', contentHtml);
    return this.sendEmail(to, 'Verify your email address - Diskus', finalHtml);
  }

  static async sendPasswordResetEmail(to: string, name: string, token: string, originUrl: string) {
    const separator = originUrl.includes('?') ? '&' : '?';
    const resetUrl = `${originUrl}${separator}reset_token=${token}`;

    const contentHtml = `
      <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #111827; letter-spacing: -0.5px;">Reset your password</h2>
      <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
        Hi <strong>${name}</strong>,<br>
        We received a request to reset your password. Click the button below to choose a new password.
      </p>
      <div style="margin: 32px 0; text-align: center;">
        <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Reset Password</a>
      </div>
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
      <div style="background-color: #f9fafb; padding: 12px 16px; border-radius: 8px; border: 1px solid #f3f4f6; word-break: break-all;">
        <a href="${resetUrl}" style="color: #2563eb; font-size: 13px; text-decoration: none;">${resetUrl}</a>
      </div>
      <p style="margin: 32px 0 0 0; color: #9ca3af; font-size: 13px; text-align: center;">
        If you didn't request a password reset, you can safely ignore this email. This link will expire in 1 hour.
      </p>
    `;

    const finalHtml = this.getEmailLayout('Reset your password - Diskus', contentHtml);
    return this.sendEmail(to, 'Reset your password - Diskus', finalHtml);
  }
}
