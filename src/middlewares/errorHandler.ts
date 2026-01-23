import { NextFunction, Request, Response } from 'express';

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Log full error on the server for diagnosis
  console.error('Global error handler:', {
    code: err?.code,
    message: err?.message,
    method: req.method,
    path: req.path,
    stack: err?.stack,
    statusCode: err?.status
  });

  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Handle specific database errors with meaningful messages
  let statusCode = err?.status ? err.status : 500;
  let userMessage = 'Internal Server Error';
  
  // Handle multer file size errors
  if (err?.code === 'LIMIT_FILE_SIZE') {
    userMessage = 'File too large. Maximum file size is 500MB';
    statusCode = 413; // Payload too large
  } else if (err?.code === 'LIMIT_PART_COUNT') {
    userMessage = 'Too many file parts';
    statusCode = 400;
  } else if (err?.code === 'LIMIT_FILE_COUNT') {
    userMessage = 'Too many files';
    statusCode = 400;
  } else if (err?.code === 'LIMIT_FIELD_KEY') {
    userMessage = 'Field name too long';
    statusCode = 400;
  } else if (err?.code === 'LIMIT_FIELD_VALUE') {
    userMessage = 'Field value too long';
    statusCode = 400;
  } else if (err?.code === 'LIMIT_FIELD_COUNT') {
    userMessage = 'Too many fields';
    statusCode = 400;
  } else if (err?.code === 'LIMIT_UNEXPECTED_FILE') {
    userMessage = 'Unexpected file field';
    statusCode = 400;
  } else if (err?.code === 'LIMIT_ABORTED') {
    userMessage = 'File upload aborted';
    statusCode = 400;
  } else if (err?.code === 'ER_DUP_ENTRY') {
    // Extract field name from error message (e.g., "Duplicate entry 'value' for key 'table.field'")
    const match = err?.message?.match(/for key '([^']+)'/);
    const fieldInfo = match ? match[1] : 'duplicate value';
    userMessage = `A record with this ${fieldInfo.split('.')[1] || 'field'} already exists`;
    statusCode = 409; // Conflict status code
  } else if (err?.code === 'ER_NO_REFERENCED_ROW') {
    userMessage = 'Referenced record does not exist';
    statusCode = 400;
  } else if (err?.code === 'ER_NO_REFERENCED_ROW_2') {
    userMessage = 'Referenced record does not exist';
    statusCode = 400;
  } else if (err?.code === 'ER_BAD_NULL_ERROR') {
    userMessage = 'Required field is missing';
    statusCode = 400;
  } else if (err?.code === 'ER_DATA_TOO_LONG') {
    userMessage = 'Provided data is too long for one or more fields';
    statusCode = 400;
  } else if (statusCode >= 500) {
    // For 500+ errors, only expose message in development
    userMessage = isDevelopment ? (err?.message || 'Internal Server Error') : 'Internal Server Error';
  } else {
    userMessage = err?.message || userMessage;
  }

  res.status(statusCode).json({
    message: userMessage,
    status: false,
    ...(isDevelopment && { 
      code: err?.code,
      stack: err?.stack 
    })
  });
};

export default errorHandler;
