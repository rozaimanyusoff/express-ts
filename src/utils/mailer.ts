import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const transporter = nodemailer.createTransport({
  auth: {
    pass: process.env.EMAIL_PASS,
    user: process.env.EMAIL_USER,
  },
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
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
    from: `"ADMS" <${process.env.EMAIL_USER}>`,
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
   
  console.log('Message sent: %s', info.messageId);
};