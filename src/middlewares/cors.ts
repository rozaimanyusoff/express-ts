import cors from 'cors';

/* cors options */
export default cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://adms4.ranhilltechnologies.com.my', 'http://100.1.1.129', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});