import { Request, Response } from 'express';
import {
  getAllUsers,
  updateUser,
  assignUserToGroups,
  verifyLoginCredentials
} from '../models/userModel';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// ===== Interfaces =====

interface AdminUser {
  username: string;
  password: string;
  email: string;
  fname: string;
  user_type: number;
  last_nav: string;
  status: number;
  role: number;
  group: number;
  created_at: Date;
  activated_at: Date;
}

interface AssignGroupsRequest extends Request {
  body: {
    userId: number;
    groups: number[];
  };
}

interface Users {
  id: number;
  username: string;
  email: string;
  password: string;
  created_at: Date;
  activation_code: string | null;
  fname: string;
  contact: string;
  user_type: number;
  last_login: Date | null;
  last_nav: string | null;
  last_ip: string | null;
  last_host: string | null;
  last_os: string | null;
  status: number;
  role: number;
  usergroups: string | null; // Updated field to store comma-separated group IDs
  reset_token: string | null;
  activated_at: Date | null;
}

// Get all users
export const getAllUser = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const users = await getAllUsers();

    // Map users to include usergroups as a string
    const formattedUsers = users.map((user) => ({
      ...user,
      usergroups: user.usergroups || '', // Ensure usergroups is always a string
    }));

    return res.status(200).json({ success: true, users: formattedUsers });
  } catch (error: any) {
    console.error('Error getting all users:', error);
    return res.status(500).json({ message: 'Error getting all users' });
  }
};

// Update user and assign groups
export const updateUser1 = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { user_type, role, usergroups, status } = req.body;

  try {
    // Validate user ID
    const userId = Number(id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Update the user details
    await updateUser(userId, { user_type, role, status } as Users);

    // Handle user groups
    if (!Array.isArray(usergroups) || usergroups.length === 0) {
      return res.status(400).json({ message: 'Invalid or empty usergroups' });
    }

    // Assign user to groups
    await assignUserToGroups(userId, usergroups);

    return res.status(200).json({ message: 'User updated successfully' });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return res.status(500).json({ message: 'Error updating user', error: error.message });
  }
};

// Assign user to groups directly
export const assignUserToGroups1 = async (
  req: AssignGroupsRequest,
  res: Response
): Promise<Response> => {
  const { userId, groups } = req.body;

  if (!userId || !Array.isArray(groups)) {
    return res.status(400).json({ status: 'Error', message: 'Invalid input' });
  }

  try {
    await assignUserToGroups(userId, groups);
    return res
      .status(200)
      .json({ status: 'Success', message: 'User assigned to groups successfully' });
  } catch (error: any) {
    console.error('Error assigning user to groups:', error);
    return res
      .status(500)
      .json({ status: 'Error', message: 'Error assigning user to groups', error: error.message });
  }
};

// Login user
export const loginUser = async (req: Request, res: Response): Promise<Response> => {
  const { emailOrUsername, password } = req.body;

  try {
    const { success, user, message } = await verifyLoginCredentials(emailOrUsername, password);

    if (!success) {
      return res.status(401).json({ success: false, message });
    }

    return res.status(200).json({
      success: true,
      user: {
        ...user,
        usergroups: user?.usergroups || '', // Ensure usergroups is always a string
      },
    });
  } catch (error: any) {
    console.error('Error logging in user:', error);
    return res.status(500).json({ message: 'Error logging in user', error: error.message });
  }
};