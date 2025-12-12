// Vehicle Assessment Notification Email Template
// Usage: renderVehicleAssessmentNotification({ asset, driver, assessment, details })

interface VehicleAssessmentNotificationParams {
  assessment: {
    date: string;
    id: number;
    ncr?: string;
    rate?: string;
    remark?: string;
  };
  asset: {
    code: string;
    id: number;
    name?: string;
    ramco_id?: string;
  };
  details?: any[];
  driver: {
    email: string;
    full_name: string;
    ramco_id: string;
  };
  portalLink?: string;
  securityPin?: string;
}

export function renderVehicleAssessmentNotification({ assessment, asset, details, driver, portalLink, securityPin }: VehicleAssessmentNotificationParams): { html: string; subject: string; text: string } {
  const subject = `Vehicle Assessment Notification: ${asset.code || asset.id}`;
  // Acceptance button URL (to be replaced with actual backend URL in production)
  const acceptanceUrl = `${process.env.BACKEND_URL || 'https://your-backend-url'}/api/compliance/assessments/${assessment.id}/acceptance`;
  
  const html = `
    <h2>Vehicle Assessment Completed</h2>
    <p><strong>Register Number:</strong> ${asset.code} ${asset.name ? `- ${asset.name}` : ''}</p>
    <p><strong>Driver:</strong> ${driver.full_name} (${driver.email})</p>
    <p><strong>Assessment Date:</strong> ${assessment.date}</p>
    <p><strong>Remark:</strong> ${assessment.remark || '-'}</p>
    <p><strong>Rate:</strong> ${assessment.rate || '-'}</p>
    <p><strong>NCR:</strong> ${assessment.ncr || '-'}</p>
    ${portalLink && securityPin ? `
    <div style="background:#f8f9fa;padding:15px;margin:20px 0;border-radius:5px;border-left:4px solid #007bff;">
      <h3 style="color:#007bff;margin-top:0;">Assessment Portal Access</h3>
      <p><a href="${portalLink}" style="color:#007bff; text-decoration: underline;">Click link to access the assessment portal</a></p>
      <p><strong>Security PIN:</strong> <span style="font-family:monospace;background:#e9ecef;padding:2px 6px;border-radius:3px;font-weight:bold;">${securityPin}</span></p>
      <p style="color:#6c757d;font-size:0.9em;margin-bottom:0;">Use this PIN to access your assessment details securely.</p>
    </div>
    ` : ''}
    <p>This is an automated notification.</p>
  `;
  
  const text = `Vehicle Assessment Completed\n\nAsset: ${asset.code} ${asset.name ? `- ${asset.name}` : ''}\nDriver: ${driver.full_name} (${driver.email})\nAssessment Date: ${assessment.date}\nRemark: ${assessment.remark || '-'}\nRate: ${assessment.rate || '-'}\nNCR: ${assessment.ncr || '-'}\n${portalLink && securityPin ? `\nAssessment Portal Access:\nClick link to access the assessment portal.\nSecurity PIN: ${securityPin}\nUse this PIN to access your assessment details securely.\n` : ''}\n\nThis is an automated notification.`;
  
  return { html, subject, text };
}
