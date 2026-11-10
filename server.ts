import express, { Request, Response } from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI server-side with telemetry User-Agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * Parse Google Docs JSON structure into clean Markdown/plain text
 */
function parseGoogleDoc(doc: any): { title: string; text: string; wordCount: number; charCount: number } {
  const title = doc.title || 'Untitled Document';
  const content = doc.body?.content || [];
  const lines: string[] = [];

  for (const item of content) {
    if (item.paragraph) {
      const p = item.paragraph;
      const style = p.paragraphStyle?.namedStyleType || '';
      let paragraphText = '';

      for (const el of p.elements || []) {
        if (el.textRun?.content) {
          paragraphText += el.textRun.content;
        }
      }

      const trimmed = paragraphText.trim();
      if (!trimmed) {
        continue;
      }

      if (style === 'TITLE') {
        lines.push(`# ${trimmed}`);
      } else if (style === 'HEADING_1') {
        lines.push(`## ${trimmed}`);
      } else if (style === 'HEADING_2') {
        lines.push(`### ${trimmed}`);
      } else if (style === 'HEADING_3') {
        lines.push(`#### ${trimmed}`);
      } else if (p.bullet) {
        lines.push(`* ${trimmed}`);
      } else {
        lines.push(paragraphText.replace(/\n+$/, ''));
      }
    } else if (item.table) {
      const table = item.table;
      for (const row of table.tableRows || []) {
        const cells: string[] = [];
        for (const cell of row.tableCells || []) {
          let cellText = '';
          for (const cellContent of cell.content || []) {
            if (cellContent.paragraph) {
              for (const el of cellContent.paragraph.elements || []) {
                if (el.textRun?.content) {
                  cellText += el.textRun.content.trim() + ' ';
                }
              }
            }
          }
          cells.push(cellText.trim().replace(/\|/g, '\\|') || ' ');
        }
        lines.push(`| ${cells.join(' | ')} |`);
      }
      lines.push('');
    }
  }

  const fullText = lines.join('\n\n');
  const words = fullText.trim() ? fullText.trim().split(/\s+/).length : 0;
  return {
    title,
    text: fullText,
    wordCount: words,
    charCount: fullText.length,
  };
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Drive files list endpoint - fetches user's Google Docs from Google Drive
app.get('/api/drive/docs', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing Authorization header. Sign in with Google to access your Drive.' });
    }

    const searchQuery = typeof req.query.q === 'string' ? req.query.q : '';
    let qFilter = "mimeType = 'application/vnd.google-apps.document' and trashed = false";
    if (searchQuery.trim()) {
      const sanitized = searchQuery.replace(/'/g, "\\'");
      qFilter += ` and name contains '${sanitized}'`;
    }

    const driveUrl = new URL('https://www.googleapis.com/drive/v3/files');
    driveUrl.searchParams.set('q', qFilter);
    driveUrl.searchParams.set('fields', 'files(id, name, modifiedTime, webViewLink, iconLink, size, owners)');
    driveUrl.searchParams.set('orderBy', 'modifiedTime desc');
    driveUrl.searchParams.set('pageSize', '40');

    const response = await fetch(driveUrl.toString(), {
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      const errBody = await response.text();
      return res.status(response.status).json({
        error: `Google Drive API error: ${response.statusText}`,
        details: errBody,
      });
    }

    const data = await response.json();
    res.json({ files: data.files || [] });
  } catch (error: any) {
    console.error('Error fetching Drive files:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch Drive files' });
  }
});

// Fetch and parse a specific Google Doc by ID
app.get('/api/docs/fetch/:docId', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing Authorization header. Sign in with Google to read documents.' });
    }

    const docId = req.params.docId;
    if (!docId) {
      return res.status(400).json({ error: 'Document ID is required' });
    }

    const docUrl = `https://docs.googleapis.com/v1/documents/${encodeURIComponent(docId)}`;
    const response = await fetch(docUrl, {
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      const errBody = await response.text();
      let parsedErr: any = null;
      try {
        parsedErr = JSON.parse(errBody);
      } catch {
        // ignore
      }

      return res.status(response.status).json({
        error: parsedErr?.error?.message || `Failed to fetch document (${response.statusText})`,
        status: response.status,
        details: errBody,
      });
    }

    const docData = await response.json();
    const parsed = parseGoogleDoc(docData);

    res.json({
      id: docId,
      title: parsed.title,
      text: parsed.text,
      wordCount: parsed.wordCount,
      charCount: parsed.charCount,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching Google Doc:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch document' });
  }
});

// Append text entry to a Google Document (e.g. Rem Scratchpad)
app.post('/api/docs/append/:docId', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing Authorization header. Sign in with Google.' });
    }

    const docId = req.params.docId;
    const { text, headerTitle } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text content is required' });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const textToInsert = headerTitle
      ? `\n\n### ${headerTitle} (${timestamp})\n${text.trim()}\n`
      : `\n\n${text.trim()}\n`;

    const batchUrl = `https://docs.googleapis.com/v1/documents/${encodeURIComponent(docId)}:batchUpdate`;
    const batchRes = await fetch(batchUrl, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              endOfSegmentLocation: {
                segmentId: '',
              },
              text: textToInsert,
            },
          },
        ],
      }),
    });

    if (!batchRes.ok) {
      const errBody = await batchRes.text();
      return res.status(batchRes.status).json({
        error: `Failed to update document: ${batchRes.statusText}`,
        details: errBody,
      });
    }

    // Readback verification as required by Rem memory architecture rules
    const readbackRes = await fetch(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(docId)}`, {
      headers: { Authorization: authHeader },
    });

    let updatedDocData = null;
    if (readbackRes.ok) {
      const raw = await readbackRes.json();
      const parsed = parseGoogleDoc(raw);
      updatedDocData = {
        id: docId,
        title: parsed.title,
        text: parsed.text,
        wordCount: parsed.wordCount,
        charCount: parsed.charCount,
        fetchedAt: new Date().toISOString(),
      };
    }

    res.json({
      success: true,
      message: 'Successfully recorded memory to Google Doc',
      verified: Boolean(updatedDocData),
      updatedDoc: updatedDocData,
    });
  } catch (error: any) {
    console.error('Error appending to Google Doc:', error);
    res.status(500).json({ error: error.message || 'Failed to update Google Doc' });
  }
});

// Append row entry to a Google Sheet (e.g. Rem Memory Store or Character Memory Bank)
app.post('/api/sheets/append/:sheetId', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing Authorization header. Sign in with Google.' });
    }

    const sheetId = req.params.sheetId;
    const { range = 'Memory Index', values } = req.body;

    if (!values || !Array.isArray(values)) {
      return res.status(400).json({ error: 'Values array is required' });
    }

    const appendUrl = new URL(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}:append`
    );
    appendUrl.searchParams.set('valueInputOption', 'USER_ENTERED');
    appendUrl.searchParams.set('insertDataOption', 'INSERT_ROWS');

    const appendRes = await fetch(appendUrl.toString(), {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [values],
      }),
    });

    if (!appendRes.ok) {
      const errBody = await appendRes.text();
      return res.status(appendRes.status).json({
        error: `Failed to update spreadsheet: ${appendRes.statusText}`,
        details: errBody,
      });
    }

    const result = await appendRes.json();
    res.json({
      success: true,
      message: 'Successfully appended row to Google Sheet',
      updates: result.updates,
      verified: true,
    });
  } catch (error: any) {
    console.error('Error appending to Google Sheet:', error);
    res.status(500).json({ error: error.message || 'Failed to update Google Sheet' });
  }
});

// Streaming character chat endpoint
app.post('/api/chat/stream', async (req: Request, res: Response) => {
  try {
    const { character, documents, messages, systemInstruction: customSystemInstruction, model = 'gemini-3.8-flash' } = req.body;

    if (!character || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'character and messages array are required' });
    }

    // Use custom compiled system instruction (e.g. Constellation Framework) if provided
    let systemInstruction = customSystemInstruction;

    if (!systemInstruction) {
      // Build rich, grounded system instructions
      const activeDocs = Array.isArray(documents)
        ? documents.filter((doc: any) => doc.active !== false && doc.text)
        : [];

      let docsKnowledgePrompt = '';
      if (activeDocs.length > 0) {
        docsKnowledgePrompt = `
=== GROUNDING KNOWLEDGE BASE FROM EXTERNAL GOOGLE DOCUMENTS ===
You have direct access to the following external Google Documents from Google Drive.
Incorporate this knowledge seamlessly into your responses, character backstory, world facts, and behavioral lore:

${activeDocs
  .map(
    (doc: any, i: number) => `--- DOCUMENT #${i + 1}: "${doc.title}" (ID: ${doc.id}) ---
${doc.docUsageInstructions ? `Character usage instructions for this document: ${doc.docUsageInstructions}\n` : ''}
${doc.text}
--- END DOCUMENT #${i + 1} ---`
  )
  .join('\n\n')}

GUIDELINES FOR USING GROUNDING DOCUMENTS:
1. Stay deeply consistent with the facts, timeline, character relationships, and lore described in the documents.
2. If asked about information present in the documents, speak about it naturally as your lived experience or established knowledge, never breaking character into an AI disclaimer.
3. If the user asks a question whose answer is contained in the documents, prioritize the facts in the documents over general knowledge.
4. When relevant or asked for source evidence, you may cite or refer to the specific document title in character (e.g. "As recorded in the ancient chronicle...").
=== END GROUNDING KNOWLEDGE BASE ===
`;
      }

      systemInstruction = `You are roleplaying and fully embodying the following custom character.
Never break character, never mention that you are an AI or language model, and immerse the user in the interaction.

CHARACTER PROFILE:
- Name: ${character.name || 'Unnamed Character'}
- Title / Role: ${character.role || 'Companion'}
- Persona & Directives:
${character.directives || 'Engage naturally, thoughtfully, and charismatically with the user.'}

- Tone of Voice:
${character.tone || 'Natural, engaging, and faithful to character.'}

- Interaction Constraints & Rules:
${character.constraints || 'Stay strictly in character at all times.'}

${character.speechQuirks ? `- Speech Quirks & Catchphrases:\n${character.speechQuirks}` : ''}

${docsKnowledgePrompt}

ROLEPLAY FORMATTING CONVENTIONS:
- Use natural conversational dialogue.
- You can include descriptive physical actions, expressions, and environmental reactions in italics using asterisks (e.g., *nods slowly with a thoughtful smile* or *glances over the parchment*).
- Keep replies lively, engaging, and responsive to the user's input.
- Match the depth and pacing of the conversation naturally.`;
    }

    // Format chat history into contents format
    // Map past messages to { role: 'user' | 'model', parts: [{ text }] }
    const contents: any[] = [];
    for (const msg of messages) {
      const role = msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user';
      contents.push({
        role,
        parts: [{ text: msg.text }],
      });
    }

    // Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const streamResponse = await ai.models.generateContentStream({
      model: model || 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
      },
    });

    for await (const chunk of streamResponse) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Error during streaming chat:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Error communicating with Gemini' });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message || 'Stream generation error' })}\n\n`);
      res.end();
    }
  }
});

// Enhance or generate directives helper endpoint using Gemini
app.post('/api/character/enhance', async (req: Request, res: Response) => {
  try {
    const { idea, currentDirectives, docsSummary } = req.body;

    const prompt = `You are an expert character designer and prompt engineer.
Create or expand rich character directives for a roleplay persona based on the following input:

User Concept / Idea:
${idea || 'A fascinating companion with rich lore'}

Current Directives (if any):
${currentDirectives || 'None provided'}

${docsSummary ? `Context from Linked Google Documents:\n${docsSummary}` : ''}

Provide a JSON object with:
1. name: string
2. role: string (e.g., "Grand Archivist of the Sunken Citadel")
3. directives: string (in-depth personality, world stance, motivations, speech mannerisms)
4. tone: string (adjectives and speech guidelines)
5. constraints: string (rules never to violate, boundaries, behavioral guardrails)
6. speechQuirks: string (quirks, verbal tics, catchphrases)
7. greeting: string (evocative first message opening the conversation)
8. suggestedPrompts: array of 3 short questions or statements the user can ask this character to test their lore and persona

Respond with ONLY valid JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const jsonText = (response.text ?? '{}').trim();
    const data = JSON.parse(jsonText);
    res.json(data);
  } catch (error: any) {
    console.error('Error enhancing character:', error);
    res.status(500).json({ error: error.message || 'Failed to enhance character directives' });
  }
});

// Create HTTP server
const httpServer = http.createServer(app);

// Setup Vite middleware in dev or static files in prod
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`PersonaCraft server running at http://0.0.0.0:${port}`);
});
