import nodemailer from 'nodemailer';
import logger from '../utils/logger';

import { SMTP_HOST, SMTP_PASSWORD, SMTP_PORT, SMTP_REQUIRE_TLS, SMTP_SECURE, SMTP_USER } from './env';

const transporter = nodemailer.createTransport({
  auth: {
    pass: SMTP_PASSWORD,
    user: SMTP_USER,
  },
  host: SMTP_HOST,
  port: SMTP_PORT,
  requireTLS: SMTP_REQUIRE_TLS,
  secure: SMTP_SECURE,
  tls: { rejectUnauthorized: false },
});

export interface MailOptions {
  attachments?: {
    contentType?: string;
    filename?: string;
    path?: string;
  }[];
  cc?: string;
  text?: string;
}

// Backward compatible API: allow optional text, cc and attachments
export const sendMail = async (to: string, subject: string, html: string, options?: MailOptions) => {
  const mail: any = {
    from: `"ADMS" <${SMTP_USER}>`,
    html,
    subject,
    to,
  };
  if (options?.text) mail.text = options.text;
  if (options?.cc) mail.cc = options.cc;
  if (options?.attachments && Array.isArray(options.attachments) && options.attachments.length > 0) {
    mail.attachments = options.attachments;
  }
  const info = await transporter.sendMail(mail);

  logger.info('Message sent: %s', info.messageId);
  return info;
};