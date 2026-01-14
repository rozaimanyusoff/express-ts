/**
 * Asset Transfer Item Format Helper
 * Standardized format for all asset transfer emails
 * Maintains consistency across transfer request, approved, accepted, and transferred notifications
 */

export interface ItemFormatConfig {
  bgSoft: string;
  border: string;
  primarySoft: string;
  tdLabelStyle: string;
  tdStyle: string;
  tableStyle: string;
  thStyle: string;
}

export interface TransferItem {
  effective_date?: string | Date;
  transfer_type?: string; // Asset Type
  identifierDisplay?: string;
  identifier?: string;
  asset_code?: string;
  register_number?: string;
  reason?: string;
  reasons?: string;
  currOwnerName?: string;
  newOwnerName?: string;
  currCostcenterName?: string;
  newCostcenterName?: string;
  currDepartmentCode?: string;
  newDepartmentCode?: string;
  currDistrictCode?: string;
  newDistrictCode?: string;
  // Additional fields for acceptance emails
  asset?: any;
  brand_name?: string;
  model_name?: string;
  current_owner?: any;
}

const safe = (v: any) => (v !== undefined && v !== null && String(v).trim() !== '' ? v : '-');

const formatDate = (d: any) => {
  if (!d) return '-';
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Generate a standardized item card with header info and transfer details table
 * This format is used for transfer items, approved items, accepted items, transferred items
 */
export function generateTransferItemCard(item: TransferItem, config: ItemFormatConfig): string {
  const {
    bgSoft,
    border,
    primarySoft,
    tdLabelStyle,
    tdStyle,
    tableStyle,
    thStyle
  } = config;

  const cardStyle = `background:${bgSoft}; border:1px solid ${border}; border-radius:8px; padding:14px 16px; margin-bottom:14px; font-size:14px; line-height:1.55;`;
  const labelStyle = 'font-weight:600; display:inline-block; min-width:160px; vertical-align:top;';
  const valueStyle = 'display:inline-block; min-width:180px;';
  const rowStyle = 'margin-bottom:6px;';

  // Header section
  const headerHtml = `
    <div style="${cardStyle}">
      <div style="margin-bottom:12px;">
        <div style="${rowStyle}"><span style="${labelStyle}">Effective Date:</span> <span style="${valueStyle}">${formatDate(item.effective_date)}</span></div>
        <div style="${rowStyle}"><span style="${labelStyle}">Asset Type:</span> <span style="${valueStyle}">${safe(item.transfer_type)}</span></div>
        <div style="${rowStyle}"><span style="${labelStyle}">Register Number:</span> <span style="${valueStyle}">${safe(item.identifierDisplay || item.identifier || item.asset_code || item.register_number)}</span></div>
        <div style="${rowStyle}"><span style="${labelStyle}">Reason:</span> <span style="${valueStyle}">${safe(item.reasons || item.reason)}</span></div>
      </div>
  `;

  // Transfer Details table (only if we have current/new values)
  const hasTransferDetails = item.currOwnerName || item.newOwnerName || 
                           item.currCostcenterName || item.newCostcenterName ||
                           item.currDepartmentCode || item.newDepartmentCode ||
                           item.currDistrictCode || item.newDistrictCode;

  let tableHtml = '';
  if (hasTransferDetails) {
    tableHtml = `
      <div style="margin-top:16px; font-weight:600; color:${primarySoft}; font-size:13px; margin-bottom:8px;">Transfer Details</div>
      <table style="${tableStyle}">
        <tr>
          <th style="${thStyle}">Field</th>
          <th style="${thStyle}">Current</th>
          <th style="${thStyle}">New</th>
        </tr>
        ${item.currOwnerName || item.newOwnerName ? `
        <tr>
          <td style="${tdLabelStyle}">Owner</td>
          <td style="${tdStyle}">${safe(item.currOwnerName)}</td>
          <td style="${tdStyle}">${safe(item.newOwnerName)}</td>
        </tr>
        ` : ''}
        ${item.currCostcenterName || item.newCostcenterName ? `
        <tr>
          <td style="${tdLabelStyle}">Cost Center</td>
          <td style="${tdStyle}">${safe(item.currCostcenterName)}</td>
          <td style="${tdStyle}">${safe(item.newCostcenterName)}</td>
        </tr>
        ` : ''}
        ${item.currDepartmentCode || item.newDepartmentCode ? `
        <tr>
          <td style="${tdLabelStyle}">Department</td>
          <td style="${tdStyle}">${safe(item.currDepartmentCode)}</td>
          <td style="${tdStyle}">${safe(item.newDepartmentCode)}</td>
        </tr>
        ` : ''}
        ${item.currDistrictCode || item.newDistrictCode ? `
        <tr>
          <td style="${tdLabelStyle}">Location</td>
          <td style="${tdStyle}">${safe(item.currDistrictCode)}</td>
          <td style="${tdStyle}">${safe(item.newDistrictCode)}</td>
        </tr>
        ` : ''}
      </table>
    `;
  }

  return `${headerHtml}${tableHtml}</div>`;
}

/**
 * Alternative format for acceptance items (without transfer details table, simpler format)
 * Used in acceptance emails where current/new values aren't needed
 */
export function generateAcceptanceItemCard(item: TransferItem, config: ItemFormatConfig): string {
  const { bgSoft, border } = config;

  const cardStyle = `background:${bgSoft}; border:1px solid ${border}; border-radius:8px; padding:14px 16px; margin-bottom:14px; font-size:14px; line-height:1.55;`;
  const labelStyle = 'font-weight:600; display:inline-block; min-width:160px; vertical-align:top;';
  const valueStyle = 'display:inline-block; min-width:180px;';
  const rowStyle = 'margin-bottom:6px;';

  return `
    <div style="${cardStyle}">
      <div style="${rowStyle}"><span style="${labelStyle}">Effective Date:</span> <span style="${valueStyle}">${formatDate(item.effective_date)}</span></div>
      <div style="${rowStyle}"><span style="${labelStyle}">Asset Type:</span> <span style="${valueStyle}">${safe(item.transfer_type || item.asset?.type?.name)}</span></div>
      <div style="${rowStyle}"><span style="${labelStyle}">Register Number:</span> <span style="${valueStyle}">${safe(item.asset?.register_number || item.register_number)}</span></div>
      <div style="${rowStyle}"><span style="${labelStyle}">Reason:</span> <span style="${valueStyle}">${safe(item.reason)}</span></div>
    </div>
  `;
}
