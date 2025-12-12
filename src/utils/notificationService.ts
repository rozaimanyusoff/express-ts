/**
 * Notification Service for maintenance request lifecycle
 * Centralizes Socket.IO event emissions for real-time badge updates
 */

import * as maintenanceModel from '../p.maintenance/maintenanceModel';
import { getSocketIOInstance } from './socketIoInstance';

/**
 * Emit event when a new maintenance request is created
 * Triggers: Badge count increment for admins
 * 
 * @param requestId - The newly created request ID
 * @param ramcoId - The requester's ID (optional)
 */
export const notifyNewMtnRequest = async (requestId: number, ramcoId?: null | string): Promise<void> => {
	try {
		const io = getSocketIOInstance();
		if (!io) {
			console.warn('notifyNewMtnRequest: Socket.IO not initialized');
			return;
		}

		// Get fresh count for all admins
		const count = await maintenanceModel.getUnseenBillsCount();
		
		// Emit to all connected admin clients
		io.emit('mtn:new-request', {
			message: 'New maintenance request submitted',
			requester: ramcoId,
			requestId,
			timestamp: new Date().toISOString()
		});

		// Emit updated badge count to all connected admins
		io.emit('mtn:badge-count', {
			count,
			timestamp: new Date().toISOString(),
			type: 'new-request'
	});

		console.log(`notifyNewMtnRequest: Emitted for request ${requestId}, current badge count: ${count}`);
	} catch (error) {
		console.error('notifyNewMtnRequest failed:', error);
		// Don't throw - socket emit failure shouldn't crash request creation
	}
};

/**
 * Emit event when admin responds to/updates a maintenance request
 * Triggers: Badge count decrement if request status changes
 * 
 * @param requestId - The updated request ID
 * @param action - Type of action (verified|approved|rejected)
 * @param adminRamco - Admin's ID who made the change (optional)
 */
export const notifyMtnRequestUpdate = async (requestId: number, action: 'approved' | 'other' | 'rejected' | 'verified', adminRamco?: null | string): Promise<void> => {
	try {
		const io = getSocketIOInstance();
		if (!io) {
			console.warn('notifyMtnRequestUpdate: Socket.IO not initialized');
			return;
		}

		// Get fresh count after update
		const count = await maintenanceModel.getUnseenBillsCount();

		// Emit update event to all connected admin clients
		io.emit('mtn:request-updated', {
			action,
			message: `Maintenance request ${action}`,
			requestId,
			timestamp: new Date().toISOString(),
			updatedBy: adminRamco
		});

		// Emit updated badge count
		io.emit('mtn:badge-count', {
			action,
			count,
			timestamp: new Date().toISOString(),
			type: 'request-updated'
		});

		console.log(`notifyMtnRequestUpdate: Emitted for request ${requestId}, action: ${action}, current badge count: ${count}`);
	} catch (error) {
		console.error('notifyMtnRequestUpdate failed:', error);
		// Don't throw - socket emit failure shouldn't crash request update
	}
};

/**
 * Batch emit of badge count (useful for periodic updates or multiple changes)
 * Use this sparingly - prefer notifyNewMtnRequest/notifyMtnRequestUpdate for specific actions
 */
export const broadcastBadgeCount = async (): Promise<void> => {
	try {
		const io = getSocketIOInstance();
		if (!io) {
			console.warn('broadcastBadgeCount: Socket.IO not initialized');
			return;
		}

		const count = await maintenanceModel.getUnseenBillsCount();

		io.emit('mtn:badge-count', {
			count,
			timestamp: new Date().toISOString(),
			type: 'broadcast'
		});

		console.log(`broadcastBadgeCount: Emitted count ${count}`);
	} catch (error) {
		console.error('broadcastBadgeCount failed:', error);
	}
};

export default {
	broadcastBadgeCount,
	notifyMtnRequestUpdate,
	notifyNewMtnRequest
};
