import * as assetModel from '../p.asset/assetModel';

/**
 * Get supervisor information by subordinate's ramco_id
 * @param subordinateRamcoId - The ramco_id of the subordinate
 * @returns Supervisor object with full_name and email, or null if not found
 */
export const getSupervisorBySubordinate = async (subordinateRamcoId: string): Promise<null | {email: string; full_name: string,}> => {
  try {
    // First get the subordinate to find their supervisor_id
    const subordinate = await assetModel.getEmployeeByRamco(subordinateRamcoId);
    if (!subordinate.supervisor_id) {
      return null;
    }

    // Then get the supervisor using their ramco_id (which is stored in supervisor_id field)
    const supervisor = await assetModel.getEmployeeByRamco(subordinate.supervisor_id);
    if (!supervisor) {
      return null;
    }

    return {
      email: supervisor.email || supervisor.contact || '',
      full_name: supervisor.full_name || supervisor.name || ''
    };
  } catch (error) {
    console.error('Error getting supervisor by subordinate:', error);
    return null;
  }
};
