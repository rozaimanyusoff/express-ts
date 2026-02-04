import cors from 'cors';

// Lazy-load allowed origins to ensure .env is loaded before evaluation
let cachedOrigins: string[] | null = null;

const getallowedOrigins = (): string[] => {
  // Return cached value if already loaded
  if (cachedOrigins !== null) {
    return cachedOrigins;
  }
  
  const envOrigins = process.env.CORS_ALLOWED_ORIGINS;
  
  if (envOrigins) {
    // Parse comma-separated list from ENV
    cachedOrigins = envOrigins
      .split(',')
      .map(origin => origin.trim())
      .filter(origin => origin.length > 0);
    return cachedOrigins;
  }
  
  // Default origins for development (check both NODE_ENV and ENV)
  const isDev = process.env.NODE_ENV === 'development' || process.env.ENV === 'development';
  if (isDev) {
    cachedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:8080',
    ];
    return cachedOrigins;
  }
  
  // Production: require explicit configuration
  console.warn('[CORS] No CORS_ALLOWED_ORIGINS configured and not in development mode. CORS will be restrictive.');
  cachedOrigins = [];
  return cachedOrigins;
};

const corsOptions = {
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow custom headers
  credentials: true, // Allow cookies/credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or server-to-server requests)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    const allowedOrigins = getallowedOrigins();
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin '${origin}' not allowed by CORS`));
    }
  },
};

export default cors(corsOptions);