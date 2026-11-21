import { Router, Request, Response } from 'express';
import { runInSandbox } from '../services/dockerRunner.js';
import { explainQuery } from '../services/sqlExplainer.js';

export const traceRouter = Router();

traceRouter.post('/', async (req: Request, res: Response) => {
  const { code, language } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Source code is required.' });
  }

  const lang = (language || 'cpp').toLowerCase();

  try {
    if (lang === 'sql') {
      const result = await explainQuery(code);
      return res.json(result);
    } else if (lang === 'cpp' || lang === 'c') {
      const result = await runInSandbox(code, lang);
      return res.json(result);
    } else {
      return res.status(400).json({ error: `Unsupported language: ${language}` });
    }
  } catch (err: any) {
    return res.status(500).json({
      error: 'Execution failed',
      details: err.message
    });
  }
});
