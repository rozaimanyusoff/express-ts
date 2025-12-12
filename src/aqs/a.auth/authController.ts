import { Request, Response } from "express";
import * as authModel from "./authModel";
import { auth } from "../../utils/db";
import { RequestAccess } from "./interface";

export const requestAccess = async (req: Request, res: Response): Promise<Response> => {
  const { email, contactNo, employmentType, department, position, reasonAccess } = req.body;

  try {

    const result = await authModel.createAccessRequest(email, contactNo, employmentType, department, position, reasonAccess, 'pending');

    return res.status(201).json({ status: true, message: "Access request submitted successfully", requestId: result.insertId });
  } catch (error) {
    return res.status(500).json({ status: false, message: "Internal server error", error: (error as Error).message });
  }
};

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
      return res.status(200).json({ status: true, message: "Login successful", user });
    } else {
      return res.status(401).json({ status: false, message: "Invalid credentials" });
    }
  } catch (error) {
    return res.status(500).json({ status: false, message: "Internal server error", error: (error as Error).message });
  }
};

export const signup = async (req: Request, res: Response): Promise<Response> => {
  // Implement your signup logic here
  const { name, username, password, email } = req.body;

  try {
    // check if username is already taken
    const response = await auth.api.isUsernameAvailable({
      body: {
        username
      },
    });

    if (!response.available) {
      return res.status(400).json({ status: false, message: "Username is already taken" });
    }

    const newUser = await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
        username,
        displayUsername: username
      },
    });

    return res.status(201).json({ status: true, message: "Signup successful", user: newUser });
  } catch (error) {
    return res.status(500).json({ status: false, message: "Internal server error", error: (error as Error).message });
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

    return res.status(200).json({ status: true, message: "Logout successful"});
  } catch (error) {
    return res.status(500).json({ status: false, message: "Internal server error", error: (error as Error).message });
  }
};