import nodemailer from 'nodemailer';
import logger from '../utils/logger';

import { EMAIL_HOST, EMAIL_PASS, EMAIL_PORT, EMAIL_USER } from './env';

const transporter = nodemailer.createTransport({
  auth: {
    pass: EMAIL_PASS,
    user: EMAIL_USER,
  },
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: false, // true for 465, false for other ports
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
    from: `"ADMS" <${EMAIL_USER}>`,
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
};