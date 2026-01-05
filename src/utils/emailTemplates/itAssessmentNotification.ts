// IT Computer Assessment Notification Email Template
// Usage: renderITAssessmentNotification({ asset, technician, assessment, assessedOwner, costcenter, department, location })

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
  assessedOwner?: {
    name?: string;
    email?: string;
    ramco_id?: string;
  };
  costcenter?: {
    id: number;
    name?: string;
  };
  department?: {
    id: number;
    name?: string;
  };
  location?: {
    id: number;
    name?: string;
  };
}

// Format date as d/m/yyyy
function formatDateToDMY(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr; // Return original if parsing fails
  }
}

export function renderITAssessmentNotification({ 
  assessment, 
  asset, 
  technician, 
  assessedOwner,
  costcenter,
  department,
  location
}: ITAssessmentNotificationParams): { html: string; subject: string; text: string } {
  const subject = `IT Computer Assessment Completed: ${asset.register_number || asset.id}`;
  
  // Format assessment date as d/m/yyyy
  const formattedDate = formatDateToDMY(assessment.date);
  
  // Format overall score as score/5
  const scoreDisplay = assessment.overall_score !== undefined ? `${assessment.overall_score}/5` : 'N/A';
  
  const html = `
    <h2>IT Computer Assessment Completed</h2>
    
    <h3 style="color:#333;margin-top:25px;margin-bottom:10px;border-bottom:2px solid #28a745;padding-bottom:5px;">Device Information</h3>
    <p><strong>Register Number:</strong> ${asset.register_number || 'N/A'}</p>
    <p><strong>Device Category:</strong> ${asset.category || 'N/A'}</p>
    <p><strong>Brand/Model:</strong> ${asset.brand || 'N/A'}${asset.model ? ` - ${asset.model}` : ''}</p>
    
    <h3 style="color:#333;margin-top:25px;margin-bottom:10px;border-bottom:2px solid #0066cc;padding-bottom:5px;">Assessment Details</h3>
    <p><strong>Assessment Date:</strong> ${formattedDate}</p>
    <p><strong>Assessment Year:</strong> ${assessment.year || 'N/A'}</p>
    <p><strong>Overall Score:</strong> ${scoreDisplay}</p>
    <p><strong>Technician:</strong> ${technician.full_name} (${technician.ramco_id})</p>
    
    <h3 style="color:#333;margin-top:25px;margin-bottom:10px;border-bottom:2px solid #ff9800;padding-bottom:5px;">Ownership & Allocation</h3>
    <p><strong>Assessed Owner:</strong> ${assessedOwner?.name || assessedOwner?.ramco_id || 'N/A'}</p>
    <p><strong>Cost Center:</strong> ${costcenter?.name || costcenter?.id || 'N/A'}</p>
    <p><strong>Department:</strong> ${department?.name || department?.id || 'N/A'}</p>
    <p><strong>Location:</strong> ${location?.name || location?.id || 'N/A'}</p>
    
    ${assessment.remarks ? `<h3 style="color:#333;margin-top:25px;margin-bottom:10px;">Remarks</h3><p>${assessment.remarks}</p>` : ''}
    
    <div style="background:#f0f7ff;padding:15px;margin:25px 0;border-radius:5px;border-left:4px solid #28a745;">
      <p style="color:#28a745;margin:0;font-weight:bold;">✓ Assessment recorded in system</p>
      <p style="color:#666;font-size:0.9em;margin:5px 0 0 0;">Assessment ID: ${assessment.id}</p>
    </div>
    
    <p style="color:#999;font-size:0.85em;">This is an automated notification.</p>
  `;
  
  const ownerDisplay = assessedOwner?.name || assessedOwner?.ramco_id || 'N/A';
  const ccDisplay = costcenter?.name || costcenter?.id || 'N/A';
  const deptDisplay = department?.name || department?.id || 'N/A';
  const locDisplay = location?.name || location?.id || 'N/A';
  
  const text = `IT Computer Assessment Completed

DEVICE INFORMATION
Register Number: ${asset.register_number || 'N/A'}
Device Category: ${asset.category || 'N/A'}
Brand/Model: ${asset.brand || 'N/A'}${asset.model ? ` - ${asset.model}` : ''}

ASSESSMENT DETAILS
Assessment Date: ${formattedDate}
Assessment Year: ${assessment.year || 'N/A'}
Overall Score: ${scoreDisplay}
Technician: ${technician.full_name} (${technician.ramco_id})

OWNERSHIP & ALLOCATION
Assessed Owner: ${ownerDisplay}
Cost Center: ${ccDisplay}
Department: ${deptDisplay}
Location: ${locDisplay}

${assessment.remarks ? `Remarks: ${assessment.remarks}\n` : ''}
✓ Assessment recorded in system
Assessment ID: ${assessment.id}

This is an automated notification.`;
  
  return { html, subject, text };
}
