import { Request, Response } from "express";
import { auth } from "../../utils/db";
import * as requestModel from "./requestModel";

export const findAllRequests = async (req: Request, res: Response): Promise<Response> => {
  try {
    const requests = await requestModel.getAllAccessRequests();
    return res.status(200).json({ status: true, data: requests });
  } catch (error) {
    return res.status(500).json({ status: false, message: "Internal server error", error: (error as Error).message });
  }
};

export const createRequestAccess = async (req: Request, res: Response): Promise<Response> => {
  const { name, email, contactNo, employmentType, department, position, reasonAccess } = req.body;

  try {

    const result = await requestModel.createAccessRequest(name, email, contactNo, employmentType, department, position, reasonAccess, 'pending');
    return res.status(201).json({ status: true, message: "Access request submitted successfully", requestId: result.insertId });
  } catch (error) {
    return res.status(500).json({ status: false, message: "Internal server error", error: (error as Error).message });
  }
};