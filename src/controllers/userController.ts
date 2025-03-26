import { Request, Response } from 'express';
import {
  getAllUsers,
  updateUser,
  assignUserToGroups
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

// Get all users
export const getAllUser = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const users = await getAllUsers();
    return res.status(200).json({ success: true, users });
  } catch (error: any) {
    console.error('Error getting all users:', error);
    return res.status(500).json({ message: 'Error getting all users' });
  }
};

// Update user and assign groups
export const updateUser1 = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const updatedUser = req.body;

  try {
    await updateUser(Number(id), updatedUser);

    let groups: number[] = [];

    if (updatedUser.accessgroups) {
      if (Array.isArray(updatedUser.accessgroups)) {
        groups = updatedUser.accessgroups as number[];
      } else if (typeof updatedUser.accessgroups === 'string') {
        groups = (updatedUser.accessgroups as string)
          .split(',')
          .map((g: string) => parseInt(g.trim(), 10))
          .filter((g: number) => !isNaN(g));
      }
    }

    if (groups.length > 0) {
      await assignUserToGroups(Number(id), groups);
    }

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