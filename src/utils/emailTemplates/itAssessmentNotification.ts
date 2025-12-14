// IT Computer Assessment Notification Email Template
// Usage: renderITAssessmentNotification({ asset, technician, assessment })

interface ITAssessmentNotificationParams {
  assessment: {
    date: string;
    id: number;
    overall_score?: number;
    remarks?: string;
    year?: number;
  };
  asset: {
    brand?: string;
    category?: string;
    id: number;
    model?: string;
    register_number?: string;
  };
  technician: {
    email: string;
    full_name: string;
    ramco_id: string;
  };
}

export function renderITAssessmentNotification({ assessment, asset, technician }: ITAssessmentNotificationParams): { html: string; subject: string; text: string } {
  const subject = `IT Computer Assessment Completed: ${asset.register_number || asset.id}`;
  
  const html = `
    <h2>IT Computer Assessment Completed</h2>
    <p><strong>Register Number:</strong> ${asset.register_number || 'N/A'}</p>
    <p><strong>Device Category:</strong> ${asset.category || 'N/A'}</p>
    <p><strong>Brand/Model:</strong> ${asset.brand || 'N/A'}${asset.model ? ` - ${asset.model}` : ''}</p>
    <p><strong>Technician:</strong> ${technician.full_name} (${technician.ramco_id})</p>
    <p><strong>Assessment Date:</strong> ${assessment.date}</p>
    <p><strong>Assessment Year:</strong> ${assessment.year || 'N/A'}</p>
    <p><strong>Overall Score:</strong> ${assessment.overall_score !== undefined ? assessment.overall_score : 'N/A'}</p>
    <p><strong>Remarks:</strong> ${assessment.remarks || '-'}</p>
    <div style="background:#f8f9fa;padding:15px;margin:20px 0;border-radius:5px;border-left:4px solid #28a745;">
      <p style="color:#28a745;margin:0;"><strong>✓ Assessment recorded in system</strong></p>
      <p style="color:#6c757d;font-size:0.9em;margin:5px 0 0 0;">Assessment ID: ${assessment.id}</p>
    </div>
    <p>This is an automated notification.</p>
  `;
  
  const text = `IT Computer Assessment Completed\n\nRegister Number: ${asset.register_number || 'N/A'}\nDevice Category: ${asset.category || 'N/A'}\nBrand/Model: ${asset.brand || 'N/A'}${asset.model ? ` - ${asset.model}` : ''}\nTechnician: ${technician.full_name} (${technician.ramco_id})\nAssessment Date: ${assessment.date}\nAssessment Year: ${assessment.year || 'N/A'}\nOverall Score: ${assessment.overall_score !== undefined ? assessment.overall_score : 'N/A'}\nRemarks: ${assessment.remarks || '-'}\n\nAssessment recorded in system\nAssessment ID: ${assessment.id}\n\nThis is an automated notification.`;
  
  return { html, subject, text };
}
