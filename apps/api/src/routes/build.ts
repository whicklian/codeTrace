import { Router, Request, Response } from 'express';
import { buildAndRunProject } from '../services/projectBuilder.js';

export const buildRouter = Router();

buildRouter.post('/', async (req: Request, res: Response) => {
  const { files, entryFile, language, buildCommand, stdinInput } = req.body;

  if (!files || typeof files !== 'object' || Object.keys(files).length === 0) {
    return res.status(400).json({ error: 'Project files are required (Record<string, string>).' });
  }

  try {
    const result = await buildAndRunProject({
      files,
      entryFile,
      language: language || 'cpp',
      buildCommand,
      stdinInput
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      error: 'Project Build & Run Failure',
      details: err.message
    });
  }
});
