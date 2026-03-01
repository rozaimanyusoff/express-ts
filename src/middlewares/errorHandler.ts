import { NextFunction, Request, Response } from 'express';
import logger from '../utils/logger';
import { getErrorMessage } from '../utils/errorUtils';

interface HttpError extends Error {
  code?: string;
  status?: number;
}

const errorHandler = (err: HttpError | unknown, req: Request, res: Response, _next: NextFunction) => {
  const error: HttpError = err instanceof Error
    ? (err as HttpError)
    : Object.assign(new Error(String(err)));

  // Log full error on the server for diagnosis
  logger.error('Global error handler:', {
    code: error?.code,
    message: error?.message,
    method: req.method,
    path: req.path,
    stack: error?.stack,
    statusCode: error?.status
  });

  const isDevelopment = process.env.NODE_ENV === 'development';

  // Handle specific database errors with meaningful messages
  let statusCode = error?.status ? error.status : 500;
  let userMessage = 'Internal Server Error';

  // Handle multer file size errors
  if (error?.code === 'LIMIT_FILE_SIZE') {
    userMessage = 'File too large. Maximum file size is 500MB';
    statusCode = 413; // Payload too large
  } else if (error?.code === 'LIMIT_PART_COUNT') {
    userMessage = 'Too many file parts';
    statusCode = 400;
  } else if (error?.code === 'LIMIT_FILE_COUNT') {
    userMessage = 'Too many files';
    statusCode = 400;
  } else if (error?.code === 'LIMIT_FIELD_KEY') {
    userMessage = 'Field name too long';
    statusCode = 400;
  } else if (error?.code === 'LIMIT_FIELD_VALUE') {
    userMessage = 'Field value too long';
    statusCode = 400;
  } else if (error?.code === 'LIMIT_FIELD_COUNT') {
    userMessage = 'Too many fields';
    statusCode = 400;
  } else if (error?.code === 'LIMIT_UNEXPECTED_FILE') {
    userMessage = 'Unexpected file field';
    statusCode = 400;
  } else if (error?.code === 'LIMIT_ABORTED') {
    userMessage = 'File upload aborted';
    statusCode = 400;
  } else if (error?.code === 'ER_DUP_ENTRY') {
    // Extract field name from error message (e.g., "Duplicate entry 'value' for key 'table.field'")
    const match = error?.message?.match(/for key '([^']+)'/);
    const fieldInfo = match ? match[1] : 'duplicate value';
    userMessage = `A record with this ${fieldInfo.split('.')[1] || 'field'} already exists`;
    statusCode = 409; // Conflict status code
  } else if (error?.code === 'ER_NO_REFERENCED_ROW') {
    userMessage = 'Referenced record does not exist';
    statusCode = 400;
  } else if (error?.code === 'ER_NO_REFERENCED_ROW_2') {
    userMessage = 'Referenced record does not exist';
    statusCode = 400;
  } else if (error?.code === 'ER_BAD_NULL_ERROR') {
    userMessage = 'Required field is missing';
    statusCode = 400;
  } else if (error?.code === 'ER_DATA_TOO_LONG') {
    userMessage = 'Provided data is too long for one or more fields';
    statusCode = 400;
  } else if (statusCode >= 500) {
    // For 500+ errors, only expose message in development
    userMessage = isDevelopment ? (error?.message || 'Internal Server Error') : 'Internal Server Error';
  } else {
    // For 4xx errors, use predefined messages - don't expose raw error messages
    userMessage = error?.message && typeof getErrorMessage(error) === 'string'
      ? getErrorMessage(error).substring(0, 200)  // Limit length and only if explicitly set
      : userMessage;
  }

  return res.status(statusCode).json({
    message: userMessage,
    status: false,
    ...(isDevelopment && {
      code: error?.code,
      stack: error?.stack
    })
  });
};

export default errorHandler;
