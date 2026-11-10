// server.ts
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var port = parseInt(process.env.PORT || "3000", 10);
app.use(express.json({ limit: "10mb" }));
var ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
function parseGoogleDoc(doc) {
  const title = doc.title || "Untitled Document";
  const content = doc.body?.content || [];
  const lines = [];
  for (const item of content) {
    if (item.paragraph) {
      const p = item.paragraph;
      const style = p.paragraphStyle?.namedStyleType || "";
      let paragraphText = "";
      for (const el of p.elements || []) {
        if (el.textRun?.content) {
          paragraphText += el.textRun.content;
        }
      }
      const trimmed = paragraphText.trim();
      if (!trimmed) {
        continue;
      }
      if (style === "TITLE") {
        lines.push(`# ${trimmed}`);
      } else if (style === "HEADING_1") {
        lines.push(`## ${trimmed}`);
      } else if (style === "HEADING_2") {
        lines.push(`### ${trimmed}`);
      } else if (style === "HEADING_3") {
        lines.push(`#### ${trimmed}`);
      } else if (p.bullet) {
        lines.push(`* ${trimmed}`);
      } else {
        lines.push(paragraphText.replace(/\n+$/, ""));
      }
    } else if (item.table) {
      const table = item.table;
      for (const row of table.tableRows || []) {
        const cells = [];
        for (const cell of row.tableCells || []) {
          let cellText = "";
          for (const cellContent of cell.content || []) {
            if (cellContent.paragraph) {
              for (const el of cellContent.paragraph.elements || []) {
                if (el.textRun?.content) {
                  cellText += el.textRun.content.trim() + " ";
                }
              }
            }
          }
          cells.push(cellText.trim().replace(/\|/g, "\\|") || " ");
        }
        lines.push(`| ${cells.join(" | ")} |`);
      }
      lines.push("");
    }
  }
  const fullText = lines.join("\n\n");
  const words = fullText.trim() ? fullText.trim().split(/\s+/).length : 0;
  return {
    title,
    text: fullText,
    wordCount: words,
    charCount: fullText.length
  };
}
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY)
  });
});
app.get("/api/drive/docs", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing Authorization header. Sign in with Google to access your Drive." });
    }
    const searchQuery = typeof req.query.q === "string" ? req.query.q : "";
    let qFilter = "mimeType = 'application/vnd.google-apps.document' and trashed = false";
    if (searchQuery.trim()) {
      const sanitized = searchQuery.replace(/'/g, "\\'");
      qFilter += ` and name contains '${sanitized}'`;
    }
    const driveUrl = new URL("https://www.googleapis.com/drive/v3/files");
    driveUrl.searchParams.set("q", qFilter);
    driveUrl.searchParams.set("fields", "files(id, name, modifiedTime, webViewLink, iconLink, size, owners)");
    driveUrl.searchParams.set("orderBy", "modifiedTime desc");
    driveUrl.searchParams.set("pageSize", "40");
    const response = await fetch(driveUrl.toString(), {
      headers: {
        Authorization: authHeader
      }
    });
    if (!response.ok) {
      const errBody = await response.text();
      return res.status(response.status).json({
        error: `Google Drive API error: ${response.statusText}`,
        details: errBody
      });
    }
    const data = await response.json();
    res.json({ files: data.files || [] });
  } catch (error) {
    console.error("Error fetching Drive files:", error);
    res.status(500).json({ error: error.message || "Failed to fetch Drive files" });
  }
});
app.get("/api/docs/fetch/:docId", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing Authorization header. Sign in with Google to read documents." });
    }
    const docId = req.params.docId;
    if (!docId) {
      return res.status(400).json({ error: "Document ID is required" });
    }
    const docUrl = `https://docs.googleapis.com/v1/documents/${encodeURIComponent(docId)}`;
    const response = await fetch(docUrl, {
      headers: {
        Authorization: authHeader
      }
    });
    if (!response.ok) {
      const errBody = await response.text();
      let parsedErr = null;
      try {
        parsedErr = JSON.parse(errBody);
      } catch {
      }
      return res.status(response.status).json({
        error: parsedErr?.error?.message || `Failed to fetch document (${response.statusText})`,
        status: response.status,
        details: errBody
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
      fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    console.error("Error fetching Google Doc:", error);
    res.status(500).json({ error: error.message || "Failed to fetch document" });
  }
});
app.post("/api/chat/stream", async (req, res) => {
  try {
    const { character, documents, messages, systemInstruction: customSystemInstruction, model = "gemini-3.8-flash" } = req.body;
    if (!character || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "character and messages array are required" });
    }
    let systemInstruction = customSystemInstruction;
    if (!systemInstruction) {
      const activeDocs = Array.isArray(documents) ? documents.filter((doc) => doc.active !== false && doc.text) : [];
      let docsKnowledgePrompt = "";
      if (activeDocs.length > 0) {
        docsKnowledgePrompt = `
=== GROUNDING KNOWLEDGE BASE FROM EXTERNAL GOOGLE DOCUMENTS ===
You have direct access to the following external Google Documents from Google Drive.
Incorporate this knowledge seamlessly into your responses, character backstory, world facts, and behavioral lore:

${activeDocs.map(
          (doc, i) => `--- DOCUMENT #${i + 1}: "${doc.title}" (ID: ${doc.id}) ---
${doc.docUsageInstructions ? `Character usage instructions for this document: ${doc.docUsageInstructions}
` : ""}
${doc.text}
--- END DOCUMENT #${i + 1} ---`
        ).join("\n\n")}

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
- Name: ${character.name || "Unnamed Character"}
- Title / Role: ${character.role || "Companion"}
- Persona & Directives:
${character.directives || "Engage naturally, thoughtfully, and charismatically with the user."}

- Tone of Voice:
${character.tone || "Natural, engaging, and faithful to character."}

- Interaction Constraints & Rules:
${character.constraints || "Stay strictly in character at all times."}

${character.speechQuirks ? `- Speech Quirks & Catchphrases:
${character.speechQuirks}` : ""}

${docsKnowledgePrompt}

ROLEPLAY FORMATTING CONVENTIONS:
- Use natural conversational dialogue.
- You can include descriptive physical actions, expressions, and environmental reactions in italics using asterisks (e.g., *nods slowly with a thoughtful smile* or *glances over the parchment*).
- Keep replies lively, engaging, and responsive to the user's input.
- Match the depth and pacing of the conversation naturally.`;
    }
    const contents = [];
    for (const msg of messages) {
      const role = msg.role === "assistant" || msg.role === "model" ? "model" : "user";
      contents.push({
        role,
        parts: [{ text: msg.text }]
      });
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    const streamResponse = await ai.models.generateContentStream({
      model: model || "gemini-3.8-flash",
      contents,
      config: {
        systemInstruction
      }
    });
    for await (const chunk of streamResponse) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}

`);
      }
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("Error during streaming chat:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || "Error communicating with Gemini" });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message || "Stream generation error" })}

`);
      res.end();
    }
  }
});
app.post("/api/character/enhance", async (req, res) => {
  try {
    const { idea, currentDirectives, docsSummary } = req.body;
    const prompt = `You are an expert character designer and prompt engineer.
Create or expand rich character directives for a roleplay persona based on the following input:

User Concept / Idea:
${idea || "A fascinating companion with rich lore"}

Current Directives (if any):
${currentDirectives || "None provided"}

${docsSummary ? `Context from Linked Google Documents:
${docsSummary}` : ""}

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
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    const jsonText = (response.text ?? "{}").trim();
    const data = JSON.parse(jsonText);
    res.json(data);
  } catch (error) {
    console.error("Error enhancing character:", error);
    res.status(500).json({ error: error.message || "Failed to enhance character directives" });
  }
});
if (process.env.NODE_ENV !== "production") {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa"
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, "dist")));
  app.get("*", (_req, res) => {
    res.sendFile(path.resolve(__dirname, "dist", "index.html"));
  });
}
app.listen(port, "0.0.0.0", () => {
  console.log(`PersonaCraft server running at http://0.0.0.0:${port}`);
});
