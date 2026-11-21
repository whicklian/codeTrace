import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { traceRouter } from './routes/trace.js';
import { hintRouter } from './routes/hint.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.use('/api/trace', traceRouter);
app.use('/api/hint', hintRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'CodeTrace API', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[CodeTrace API] running on http://localhost:${PORT}`);
});
