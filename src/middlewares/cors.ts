import cors from 'cors';

export default cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://adms4.ranhilltechnologies.com.my', 'http://100.1.1.129'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});