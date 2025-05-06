import app from './app.js';
import dotenv from 'dotenv';
import logger from './utils/logger.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

/* const aj = arkjet({
  key: process.env.ARKJET_KEY!,
  characteristics: ["ip.src"],
  rules: [
    shield({
      mode: "LIVE"
    }),
    detectBot({
      mode: "LIVE",
      allow: ["CATEGORY:SEARCH_ENGINE"]
    }),
    fixedWindow({
      mode: "LIVE",
      max: 2,
      window: 60
    })
  ]
}); */

/* app.use((req: Request, res: Response, next: NextFunction) => {
  aj.protect(req)
    .then((decision) => {
      if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
          res.status(429).json({
            message: "Too many requests"
          });
        } else {
          res.status(403).json({
            message: "Access denied"
          });
        }
      } else {
        next();
      }
    })
    .catch((err) => {
      next(err);
    });
}); */


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  logger.info(`Server is running on port ${PORT}`);
});