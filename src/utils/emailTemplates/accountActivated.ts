export const accountActivatedTemplate = (username: string, email: string, contact: string, groups: string, loginUrl: string) => `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f6f8fa; padding: 32px;">
    <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); padding: 32px;">
      <h1 style="color: #2d3748; font-size: 2rem; margin-bottom: 16px;">Account Activated</h1>
      <p style="color: #4a5568; font-size: 1.1rem;">Hello <b>${username}</b>,</p>
      <p style="color: #4a5568;">Your account has been <b>successfully activated</b>. You can now log in using the details below:</p>
      <ul style="color: #4a5568; font-size: 1.05rem; margin: 24px 0 32px 0; padding-left: 24px;">
        <li><b>Username:</b> ${username}</li>
        <li><b>Email:</b> ${email}</li>
        <li><b>Contact:</b> ${contact}</li>
        <li><b>Groups:</b> ${groups}</li>
      </ul>
      <div style="margin: 32px 0; text-align: center;">
        <a href="${loginUrl}" style="background: #2563eb; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 600; font-size: 1.1rem;">Login</a>
      </div>
      <hr style="margin: 32px 0; border: none; border-top: 1px solid #e2e8f0;">
      <p style="color: #a0aec0; font-size: 0.95rem;">If you did not request this, please ignore this email.</p>
      <p style="color: #a0aec0; font-size: 0.95rem;">&mdash; The Team</p>
    </div>
  </div>
`;
