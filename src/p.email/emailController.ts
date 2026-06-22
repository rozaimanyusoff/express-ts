import { Request, Response } from 'express';
import { sendMail } from '../utils/mailer';
import { SMTP_FROM, SMTP_HOST, SMTP_PASSWORD, SMTP_PORT, SMTP_REQUIRE_TLS, SMTP_SECURE, SMTP_USER } from '../utils/env';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const getEmailConfig = (req: Request, res: Response): Response => {
    const pass = SMTP_PASSWORD ?? '';
    const masked = pass.length > 3 ? `${pass.slice(0, 3)}***` : '***';

    return res.json({
        from: SMTP_FROM,
        host: SMTP_HOST,
        password: masked,
        port: SMTP_PORT,
        requireTLS: SMTP_REQUIRE_TLS,
        secure: SMTP_SECURE,
        user: SMTP_USER,
    });
};

export const sendTestEmail = async (req: Request, res: Response): Promise<Response> => {
    const { to } = req.body;

    if (!to || typeof to !== 'string' || !EMAIL_REGEX.test(to.trim())) {
        return res.status(400).json({ message: 'A valid "to" email address is required.', success: false });
    }

    const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e0e0e0;border-radius:8px;">
            <h2 style="color:#1a1a2e;">ADMS – Email Test</h2>
            <p>This is a test email sent from the <strong>ADMS Maintenance panel</strong>.</p>
            <hr style="border:none;border-top:1px solid #e0e0e0;margin:24px 0;" />
            <p style="font-size:12px;color:#888;">
                SMTP Host: <strong>${SMTP_HOST}</strong> &nbsp;|&nbsp;
                Port: <strong>${SMTP_PORT}</strong> &nbsp;|&nbsp;
                Sender: <strong>${SMTP_USER}</strong>
            </p>
        </div>
    `;

    try {
        const info = await sendMail(to.trim(), 'ADMS – Email Test', html);
        return res.json({ message: 'Test email sent.', messageId: (info as any)?.messageId ?? null, success: true });
    } catch (err: unknown) {
        const detail = err instanceof Error ? err.message : String(err);
        return res.status(500).json({ message: detail, success: false });
    }
};
