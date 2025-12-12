import { Request, Response } from "express";

import { auth } from "../../utils/db";

export const login = async (req: Request, res: Response): Promise<Response> => {
  const { email, password } = req.body;

  try {
    const user = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
    });

    if (user) {
      return res.status(200).json({ message: "Login successful", status: true, user });
    } else {
      return res.status(401).json({ message: "Invalid credentials", status: false });
    }
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message, message: "Internal server error", status: false });
  }
};

export const signup = async (req: Request, res: Response): Promise<Response> => {
  // Implement your signup logic here
  const { email, name, password, username } = req.body;

  try {
    // check if username is already taken
    const response = await auth.api.isUsernameAvailable({
      body: {
        username
      },
    });

    if (!response.available) {
      return res.status(400).json({ message: "Username is already taken", status: false });
    }

    const newUser = await auth.api.signUpEmail({
      body: {
        displayUsername: username,
        email,
        name,
        password,
        username
      },
    });

    return res.status(201).json({ message: "Signup successful", status: true, user: newUser });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message, message: "Internal server error", status: false });
  }
};

export const logout = async (req: Request, res: Response): Promise<Response> => {
  // Implement your logout logic here
  try {
    await auth.api.signOut({
      headers: {
        Authorization: req.headers.authorization || '',
      },
    });

    return res.status(200).json({ message: "Logout successful", status: true});
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message, message: "Internal server error", status: false });
  }
};