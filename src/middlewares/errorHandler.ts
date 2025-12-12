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

  const statusCode = err?.status ? err.status : 500;

  // In development, expose full error details; in production, hide internal details
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Expose message for expected client errors (status < 500) or in development
  const exposeMessage = (statusCode < 500) || isDevelopment || (err?.isPublic);

  res.status(statusCode).json({
    message: exposeMessage ? (err?.message) : 'Internal Server Error',
    status: false,
    ...(isDevelopment && { 
      code: err?.code,
      stack: err?.stack 
    })
  });
};

export default errorHandler;