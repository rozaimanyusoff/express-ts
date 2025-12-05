import { Request, Response, NextFunction } from 'express';

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Log full error on the server for diagnosis
  console.error('Global error handler:', {
    message: err?.message,
    code: err?.code,
    stack: err?.stack,
    path: req.path,
    method: req.method,
    statusCode: err?.status
  });

  const statusCode = err && err.status ? err.status : 500;

  // In development, expose full error details; in production, hide internal details
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Expose message for expected client errors (status < 500) or in development
  const exposeMessage = (statusCode < 500) || isDevelopment || (err && err.isPublic);

  res.status(statusCode).json({
    status: false,
    message: exposeMessage ? (err && err.message) : 'Internal Server Error',
    ...(isDevelopment && { 
      code: err?.code,
      stack: err?.stack 
    })
  });
};

export default errorHandler;