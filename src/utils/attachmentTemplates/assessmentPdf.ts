
import PDFDocument from 'pdfkit';

interface AssessmentPdfOptions {
  assessment: any;
  asset: any;
  details?: any[];
  driver: any;
}

export async function generateAssessmentPdf({ assessment, asset, details, driver }: AssessmentPdfOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
    doc.on('error', reject);

    doc.fontSize(18).text('Vehicle Assessment Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Assessment ID: ${assessment.assess_id}`);
    doc.text(`Date: ${assessment.a_date || ''}`);
    doc.text(`Asset: ${asset.code} ${asset.name ? '- ' + asset.name : ''}`);
    doc.text(`Driver: ${driver.full_name} (${driver.email})`);
    doc.text(`Remark: ${assessment.a_remark || '-'}`);
    doc.text(`Rate: ${assessment.a_rate || '-'}`);
    doc.text(`NCR: ${assessment.a_ncr || '-'}`);
    doc.moveDown();
    if (details?.length) {
      doc.fontSize(14).text('Assessment Details');
      doc.moveDown(0.5);
      details.forEach((d: any, idx: number) => {
        doc.fontSize(12).text(`${idx + 1}. ${d.criteria || ''}: ${d.value || ''}`);
      });
      doc.moveDown();
    }
    doc.text('--- End of Report ---', { align: 'center' });
    doc.end();
  });
}
