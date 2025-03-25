import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const privateKey = fs.readFileSync(path.join(__dirname, '../../certs/private.pem'), 'utf8');

export const rsaDecryptMiddleware = (req: Request, res: Response, next: NextFunction): void | Promise<void> => {
  const encrypted = req.body?.password;

  if (!encrypted || typeof encrypted !== 'string') {
    console.warn('[RSA] No password found in request body');
    res.status(400).json({ message: 'Missing encrypted password' });
    return;
  }

  //console.log('[RSA] Encrypted password received:', encrypted);
  //console.log('[RSA] Base64 length:', encrypted.length);

  try {
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      Buffer.from(encrypted, 'base64')
    );

    req.body.password = decrypted.toString('utf-8');
    console.log('[RSA] Decryption successful:', req.body.password); // only for dev
    next();
  } catch (err: any) {
    console.error('[RSA Decryption Error]', err.message || err);
    res.status(400).json({ message: 'Invalid encrypted password' });
  }
};