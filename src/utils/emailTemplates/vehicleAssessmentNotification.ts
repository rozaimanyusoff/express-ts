// Vehicle Assessment Notification Email Template
// Usage: renderVehicleAssessmentNotification({ asset, driver, assessment, details })

interface VehicleAssessmentNotificationParams {
  asset: {
    id: number;
    code: string;
    name?: string;
    ramco_id?: string;
  };
  driver: {
    ramco_id: string;
    full_name: string;
    email: string;
  };
  assessment: {
    id: number;
    date: string;
    remark?: string;
    rate?: string;
    ncr?: string;
  };
  details?: any[];
  portalLink?: string;
  securityPin?: string;
}

export function renderVehicleAssessmentNotification({ asset, driver, assessment, details, portalLink, securityPin }: VehicleAssessmentNotificationParams): { subject: string; html: string; text: string } {
  const subject = `Vehicle Assessment Notification: ${asset.code || asset.id}`;
  // Acceptance button URL (to be replaced with actual backend URL in production)
  const acceptanceUrl = `${process.env.BACKEND_URL || 'https://your-backend-url'}/api/compliance/assessments/${assessment.id}/acceptance`;
  
  const html = `
    <h2>Vehicle Assessment Completed</h2>
    <p><strong>Asset:</strong> ${asset.code} ${asset.name ? `- ${asset.name}` : ''}</p>
    <p><strong>Driver:</strong> ${driver.full_name} (${driver.email})</p>
    <p><strong>Assessment Date:</strong> ${assessment.date}</p>
    <p><strong>Remark:</strong> ${assessment.remark || '-'}</p>
    <p><strong>Rate:</strong> ${assessment.rate || '-'}</p>
    <p><strong>NCR:</strong> ${assessment.ncr || '-'}</p>
    ${portalLink && securityPin ? `
    <div style="background:#f8f9fa;padding:15px;margin:20px 0;border-radius:5px;border-left:4px solid #007bff;">
      <h3 style="color:#007bff;margin-top:0;">Assessment Portal Access</h3>
      <p><strong>Portal Link:</strong> <a href="${portalLink}" style="color:#007bff;">${portalLink}</a></p>
      <p><strong>Security PIN:</strong> <span style="font-family:monospace;background:#e9ecef;padding:2px 6px;border-radius:3px;font-weight:bold;">${securityPin}</span></p>
      <p style="color:#6c757d;font-size:0.9em;margin-bottom:0;">Use this PIN to access your assessment details securely.</p>
    </div>
    ` : ''}
    <p>
      <a href="${acceptanceUrl}" style="display:inline-block;padding:10px 20px;background:#007bff;color:#fff;text-decoration:none;border-radius:5px;">Accept Assessment</a>
    </p>
    <p>Assessment images are attached to this email for your reference.</p>
    <p>This is an automated notification.</p>
  `;
  
  const text = `Vehicle Assessment Completed\n\nAsset: ${asset.code} ${asset.name ? `- ${asset.name}` : ''}\nDriver: ${driver.full_name} (${driver.email})\nAssessment Date: ${assessment.date}\nRemark: ${assessment.remark || '-'}\nRate: ${assessment.rate || '-'}\nNCR: ${assessment.ncr || '-'}\n${portalLink && securityPin ? `\nAssessment Portal Access:\nPortal Link: ${portalLink}\nSecurity PIN: ${securityPin}\nUse this PIN to access your assessment details securely.\n` : ''}\nPlease accept the assessment at: ${acceptanceUrl}\n\nAssessment images are attached to this email for your reference.\n\nThis is an automated notification.`;
  
  return { subject, html, text };
}
