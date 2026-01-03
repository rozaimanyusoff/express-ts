export const adminPincodeTemplate = (name: string, pincode: string, brandName: string = 'System Administration') => `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f6f8fa; padding: 32px;">
    <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); padding: 32px;">
      <h1 style="color: #d32f2f; font-size: 2rem; margin-bottom: 16px;">🔐 Admin Access Code</h1>
      <p style="color: #4a5568; font-size: 1.1rem;">Hello <b>${name}</b>,</p>
      <p style="color: #4a5568;">A special admin access request has been initiated. Your one-time verification code is:</p>
      
      <div style="margin: 32px 0; padding: 24px; background: #f0f4f8; border-left: 4px solid #d32f2f; border-radius: 6px;">
        <p style="color: #2d3748; font-size: 1.8rem; letter-spacing: 0.15em; font-weight: bold; margin: 0; text-align: center; font-family: 'Courier New', monospace;">
          ${pincode}
        </p>
      </div>
      
      <p style="color: #718096; font-size: 0.95rem; text-align: center;">
        <strong>⏱️ This code will expire in 15 minutes</strong>
      </p>
      
      <hr style="margin: 32px 0; border: none; border-top: 1px solid #e2e8f0;">
      
      <div style="background: #fef2f2; border: 1px solid #fee2e2; border-radius: 6px; padding: 16px; margin: 24px 0;">
        <p style="color: #991b1b; font-size: 0.95rem; margin: 0;">
          <strong>⚠️ Security Notice:</strong> If you did not request this code, please contact your system administrator immediately. Do not share this code with anyone.
        </p>
      </div>
      
      <p style="color: #a0aec0; font-size: 0.95rem;">This is an automated message, please do not reply.</p>
      <p style="color: #a0aec0; font-size: 0.95rem; text-align: center;">&mdash; ${brandName}</p>
    </div>
  </div>
`;
