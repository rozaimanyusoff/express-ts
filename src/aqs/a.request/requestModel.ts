import { auth } from "../../utils/db";
import logger from "../../utils/logger";

const requestAccessTable = 'request_access';

export const getAllAccessRequests = async (): Promise<any[]> => {
  const query = `
    SELECT id, email, "contactNo", "employmentType", department, position, "reasonAccess", status, "reasonReject", "approvalNote", "createdAt", "updatedAt"
    FROM auth.${requestAccessTable}
    ORDER BY "createdAt" DESC
  `;

  try {
    const result = await auth.options.database.query(query);
    return result.rows;
  } catch (error) {
    logger.error(`Error fetching access requests: ${(error as Error).message}`);
    throw error;
  }
};

export const createAccessRequest = async (name: string, email: string, contactNo: string, employmentType: string, department: string, position: string, reasonAccess: string, status: string): Promise<any> => {
  const query = `
    INSERT INTO auth.${requestAccessTable} (name, email, "contactNo", "employmentType", department, position, "reasonAccess", status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `;
  const params = [
    name,
    email,
    contactNo,
    employmentType,
    department,
    position,
    reasonAccess,
    status
  ];

  try {
    const result = await auth.options.database.query(query, params);
    return result;

  } catch (error) {
    logger.error(`Error creating access request: ${(error as Error).message}`);
    throw error;
  }
};