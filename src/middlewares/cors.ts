import cors from 'cors';

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://adms4.ranhilltechnologies.com.my', // Frontend origin
  'http://100.1.1.129',
  'http://localhost:8080',
  'https://serv.ranhilltechnologies.com.my', // Backend origin (if needed)
  'https://aqs.ranhilltechnologies.com.my', // AQS origin
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies/credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow custom headers
};

export default cors(corsOptions);