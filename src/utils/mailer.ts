import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export interface MailOptions {
  text?: string;
  cc?: string;
  attachments?: Array<{
    filename?: string;
    path?: string;
    contentType?: string;
  }>;
}

// Backward compatible API: allow optional text, cc and attachments
export const sendMail = async (to: string, subject: string, html: string, options?: MailOptions) => {
  const mail: any = {
    from: `"ADMS" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };
  if (options?.text) mail.text = options.text;
  if (options?.cc) mail.cc = options.cc;
  if (options?.attachments && Array.isArray(options.attachments) && options.attachments.length > 0) {
    mail.attachments = options.attachments;
  }
  const info = await transporter.sendMail(mail);
  // eslint-disable-next-line no-console
  console.log('Message sent: %s', info.messageId);
};