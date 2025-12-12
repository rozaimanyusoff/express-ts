import { Request, Response } from "express";

import { auth } from "../../utils/db";
import * as requestModel from "./requestModel";

export const findAllRequests = async (req: Request, res: Response): Promise<Response> => {
  try {
    const requests = await requestModel.getAllAccessRequests();
    return res.status(200).json({ data: requests, status: true });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message, message: "Internal server error", status: false });
  }
};

export const createRequestAccess = async (req: Request, res: Response): Promise<Response> => {
  const { contactNo, department, email, employmentType, name, position, reasonAccess } = req.body;

  try {

    const result = await requestModel.createAccessRequest(name, email, contactNo, employmentType, department, position, reasonAccess, 'pending');
    return res.status(201).json({ message: "Access request submitted successfully", requestId: result.insertId, status: true });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message, message: "Internal server error", status: false });
  }
};