// filepath: /src/models/userModel.ts
import pool from '../utils/db';
import pkg from 'bcrypt';
const { hash, compare } = pkg;


// Define the interface
interface Users {
  id: number;
  email: string;
  username: string;
  contact: string;
  name: string;
  status: number;
  user_type: number;
  lastNav: string;
  lastLogin: string;
  role: number;
  accessgroups: string;
}

// Validate user by email or contact prior to registration
export const findUserByEmailOrContact = async (email: string, contact: string) => {
  const result = await pool.query('SELECT * FROM users WHERE email = ? OR contact = ?', [email, contact]);
  return result[0];
};

//register user if no existing user found
export const registerUser = async (username: string, email: string, password: string, activationCode: string) => {
  const [result] = await pool.query('INSERT INTO users (username, email, password, activation_code) VALUES (?, ?, ?, ?)', [username, email, password, activationCode]);
  return result;
};

//validate user activation details
export const validateActivation = async (email: string, contact: string, activationCode: string) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM users WHERE email = ? AND contact = ? AND activation_code = ?', [email, contact, activationCode]);

    return {
      valid: Array.isArray(rows) && rows.length > 0,
      user: rows[0],
    }
  } catch (error) {
    return {
      valid: false,
      error,
    };
  }
}

//activate user account
export const activateUser = async (email: string, contact: string, activationCode: string, userType: number, username: string, password: string) => {
  try {
    if (!password) {
      return {
        activated: false,
        message: 'Password is required',
      };
    }

    const hashedPassword = await hash(password, 10);
    const [result]: any = await pool.query('UPDATE users SET password = ?, user_type = ?, username = ? WHERE email = ? AND contact = ? AND activation_code = ?', [hashedPassword, userType, username, email, contact, activationCode]);
    return {
      activated: result.affectedRows > 0,
      message: result.affectedRows > 0 ? 'Account activated' : 'Invalid activation details',
    };
  } catch (error) {
    return {
      activated: false,
      message: 'Internal server error',
      error,
    };
  }
}


// Verify login credentials
export const verifyLoginCredentials = async (emailOrUsername: string, password: string) => {
  try {
    const [rows]: any = await pool.query(`SELECT u.*, GROUP_CONCAT(ug.group_id) AS accessgroups
            FROM users u
            LEFT JOIN user_groups ug ON u.id = ug.user_id
            WHERE (email = ? OR username = ?)
            AND activated_at IS NOT NULL
            GROUP BY u.id`, [emailOrUsername, emailOrUsername]);

    if (Array.isArray(rows) && rows.length === 0) {
      return {
        success: false,
        message: 'Invalid credentials',
      };
    }

    const user = rows[0];
    const passwordMatch = await compare(password, user.password);

    if (!passwordMatch) {
      return {
        success: false,
        message: 'Invalid credentials',
      };
    }

    if (user.status !== 1) {
      return {
        success: false,
        message: 'Account is inactive',
      };
    }

    // don't return password
    delete user.password;

    const formattedUser: Users = {
      id: user.id,
      email: user.email,
      username: user.username,
      contact: user.contact,
      name: user.fname,
      status: user.status,
      user_type: user.user_type,
      lastNav: user.last_nav,
      lastLogin: new Date(user.last_login).toLocaleDateString('en-us'),
      role: user.role,
      accessgroups: user.accessgroups,
    };

    return {
      success: true,
      user: formattedUser,
    };
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
}

// Update last login
export const updateLastLogin = async (userId: number) => {
  try {
    const [result] = await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [userId]);
    return result;
  }
  catch (error) {
    return {
      success: false,
      error,
    };
  }
}

// Update user password - this is used to update a user's password after they successfully change it
export const updateUserPassword = async (email: string, contact: string, newPassword: string) => {
  const hashedPassword = await hash(newPassword, 10);
  const [result]: any = await pool.query(
      'UPDATE users SET password = ? WHERE email = ? AND contact = ?',
      [hashedPassword, email, contact]
  );
  return result.affectedRows > 0;
};


// Update user reset token and status - this is used to update a user's reset token and status after they request a password reset
export const updateUserResetTokenAndStatus = async (userId: number, resetToken: string, status: number) => {
  try {
      await pool.query(
          `UPDATE users
          SET reset_token = ?, status = ?
          WHERE id = ?`,
          [resetToken, status, userId]
      );
  } catch (error) {
      console.error('Error updating user reset token and status:', error);
      throw error;
  }
};


// Reactivate user - this is used to reactivate a user using old credentials after resetting their password failed due to expired reset token
export const reactivateUser = async (userId: number) => {
  try {
      await pool.query(
          `UPDATE users
          SET status = 1,
          reset_token = null
          WHERE id = ? AND status = 3`,
          [userId]
      );
  } catch (error) {
      console.error('Error reactivating user:', error);
      throw error;
  }
};


// Update a user - managed by the admin
export const updateUser = async (userId: number, { user_type, role, status }: Users) => {
  await pool.query(
    'UPDATE users SET user_type = ?, role = ?, status = ? WHERE id = ?',
    [user_type, role, status, userId]
  );
}

// Assign a user to groups
export const assignUserToGroups = async (userId: number, groups: number[]) => {
  if (groups.length > 0) {
      const values = groups.flatMap(groupId => [userId, groupId]);
      const query = `
          INSERT IGNORE INTO user_groups (user_id, group_id, timestamp)
          VALUES ${groups.map(() => '(?, ?, NOW())').join(', ')}
      `;
      await pool.query(query, values);
  }
};


export const getUserByEmailAndPassword = async (email: string, password: string) => {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
  return rows;
};