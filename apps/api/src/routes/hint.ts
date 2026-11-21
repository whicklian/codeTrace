import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const hintRouter = Router();

hintRouter.post('/', async (req: Request, res: Response) => {
  const { code, language, currentLine, faultSummary, studentQuestion } = req.body;

  const apiKey = process.env.GEMINI_API_KEY;

  const systemInstruction = `You are CodeTrace's Socratic CS Professor.
Your goal is to help computer science students debug runtime faults, pointer mistakes, dangling references, or unoptimized database queries.
STRICT SOCRATIC RULES:
1. NEVER output corrected code or the direct fix.
2. Formulate exactly ONE sharp, targeted conceptual question pointing to the exact memory address, dangling pointer, or scan bottleneck.
3. Keep your response under 3 sentences: 1 sentence acknowledging the symptom (e.g. "You just freed memory at address 0x55a010..."), followed by 1 guiding Socratic question.`;

  const userContext = `
Language: ${language || 'cpp'}
Code Snippet:
\`\`\`${language || 'cpp'}
${code}
\`\`\`
Failing or Current Line: ${currentLine || 'Unknown'}
Runtime Fault / Diagnostic: ${JSON.stringify(faultSummary || {})}
Student Question: ${studentQuestion || "I'm stuck. What went wrong?"}
`;

  // Fallback response if GEMINI_API_KEY is not configured
  if (!apiKey) {
    if (faultSummary && faultSummary.signal === 'SIGSEGV') {
      return res.json({
        hint: `Notice line ${faultSummary.line || currentLine}: you are attempting to dereference a pointer after freeing or before allocating it. What address is stored inside that pointer right at this step?`
      });
    }

    if (language === 'sql') {
      return res.json({
        hint: "Your query is performing a sequential scan over all rows in the table. How could an index on the join or filter columns change the way PostgreSQL locates these rows?"
      });
    }

    return res.json({
      hint: "Inspect the memory addresses of your pointers before and after the modification on this line. Is the memory you are accessing still guaranteed to belong to your program?"
    });
  }

  try {
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const response = await model.generateContent(`${systemInstruction}\n\n${userContext}`);

    const text = response.response.text() || "Examine what happens to the memory address at this step.";
    return res.json({ hint: text });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Gemini Hint Generation Failed',
      details: err.message
    });
  }
});
