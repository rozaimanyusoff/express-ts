import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';
import { getErrorMessage } from '../utils/errorUtils';

const privateKey = fs.readFileSync(path.join(__dirname, '../../certs/private.pem'), 'utf8');

export const rsaDecryptMiddleware = (req: Request, res: Response, next: NextFunction): Promise<void> | void => {
  const encrypted = req.body?.password;

  if (!encrypted || typeof encrypted !== 'string') {
    logger.warn('[RSA] No password found in request body');
    void res.status(400).json({ message: 'Missing encrypted password' });
    return;
  }

  //logger.info('[RSA] Encrypted password received:', encrypted);
  //logger.info('[RSA] Base64 length:', encrypted.length);

  try {
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        oaepHash: 'sha256',
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      },
      Buffer.from(encrypted, 'base64')
    );

    req.body.password = decrypted.toString('utf-8');
    //logger.info('[RSA] Decryption successful:', req.body.password); // only for dev
    next();
  } catch (err: unknown) {
    logger.error('[RSA Decryption Error]', getErrorMessage(err));
    void res.status(400).json({ message: 'Invalid encrypted password' });
    return;
  }
};