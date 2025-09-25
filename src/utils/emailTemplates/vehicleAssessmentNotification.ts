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
}

export function renderVehicleAssessmentNotification({ asset, driver, assessment, details }: VehicleAssessmentNotificationParams): { subject: string; html: string; text: string } {
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
    <p>
      <a href="${acceptanceUrl}" style="display:inline-block;padding:10px 20px;background:#007bff;color:#fff;text-decoration:none;border-radius:5px;">Accept Assessment</a>
    </p>
    <p>A PDF of the full assessment is attached to this email.</p>
    <p>This is an automated notification.</p>
  `;
  const text = `Vehicle Assessment Completed\n\nAsset: ${asset.code} ${asset.name ? `- ${asset.name}` : ''}\nDriver: ${driver.full_name} (${driver.email})\nAssessment Date: ${assessment.date}\nRemark: ${assessment.remark || '-'}\nRate: ${assessment.rate || '-'}\nNCR: ${assessment.ncr || '-'}\n\nPlease accept the assessment at: ${acceptanceUrl}\n\nA PDF of the full assessment is attached to this email.\n\nThis is an automated notification.`;
  return { subject, html, text };
}
