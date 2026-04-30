import nodemailer from 'nodemailer';
import { structuredLogger } from '../../infra/log/logger';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter() {
    if (this.transporter) return this.transporter;

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '465');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    if (!host || !user || !pass) {
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    return this.transporter;
  }

  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: any }> {
    const from = options.from || process.env.MAIL_FROM || 'CONDSTORE OS <admin@condstoreos.com>';
    const replyTo = options.replyTo || process.env.MAIL_REPLY_TO || 'admin@condstoreos.com';

    const transporter = this.getTransporter();

    if (transporter) {
      try {
        const info = await transporter.sendMail({
          from,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
          replyTo,
        });

        structuredLogger.info('email_sent_smtp', {
          messageId: info.messageId,
          to: options.to,
          subject: options.subject,
        });

        return { success: true, messageId: info.messageId };
      } catch (error) {
        structuredLogger.error('email_send_smtp_failed', {
          error,
          to: options.to,
          subject: options.subject,
        });
        // Fallback to Resend if available
      }
    }

    // Fallback or Direct Resend if SMTP not configured or failed
    if (process.env.RESEND_API_KEY) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: from.includes('<') ? from : `CONDSTORE OS <${from}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
            reply_to: replyTo,
          }),
        });

        if (res.ok) {
          const data = await res.json() as { id: string };
          structuredLogger.info('email_sent_resend', {
            messageId: data.id,
            to: options.to,
            subject: options.subject,
          });
          return { success: true, messageId: data.id };
        } else {
          const errorText = await res.text();
          throw new Error(`Resend API error: ${res.status} - ${errorText}`);
        }
      } catch (error) {
        structuredLogger.error('email_send_resend_failed', {
          error,
          to: options.to,
          subject: options.subject,
        });
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      structuredLogger.info('email_logged_dev_only', {
        to: options.to,
        subject: options.subject,
        html: options.html.slice(0, 100) + '...',
      });
      return { success: true, messageId: 'dev-mode-no-send' };
    }

    return { success: false, error: 'No email provider configured or all providers failed' };
  }
}

export const emailService = new EmailService();
