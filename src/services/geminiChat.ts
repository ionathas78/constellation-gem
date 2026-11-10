import { Character, ChatMessage, LinkedDoc } from '../types';
import { buildConstellationSystemInstruction } from './constellationCompiler';

export interface StreamChatParams {
  character: Character;
  documents: LinkedDoc[];
  messages: ChatMessage[];
  onChunk: (chunkText: string) => void;
  onError: (errorMessage: string) => void;
  onComplete: () => void;
  signal?: AbortSignal;
}

export async function streamCharacterChat({
  character,
  documents,
  messages,
  onChunk,
  onError,
  onComplete,
  signal,
}: StreamChatParams): Promise<void> {
  try {
    const activeDocs = documents.filter((d) => character.linkedDocIds?.includes(d.id) && d.active);

    let systemInstruction: string | undefined = undefined;
    if (character.frameworkMode === 'constellation' || character.constellationPersona) {
      systemInstruction = buildConstellationSystemInstruction(
        character,
        character.constellationPersona || null,
        activeDocs
      );
    }

    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        character: {
          name: character.name,
          role: character.role,
          directives: character.directives,
          tone: character.tone,
          constraints: character.constraints,
          speechQuirks: character.speechQuirks,
          greeting: character.greeting,
        },
        systemInstruction,
        documents: activeDocs.map((d) => ({
          id: d.id,
          title: d.title,
          text: d.text,
          docUsageInstructions: d.docUsageInstructions,
        })),
        messages: messages.map((m) => ({
          role: m.role,
          text: m.text,
        })),
        model: 'gemini-3.8-flash',
      }),
      signal,
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errJson.error || `Server returned error (${response.status})`);
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported by response');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const block of lines) {
        const line = block.trim();
        if (!line.startsWith('data: ')) continue;
        const dataStr = line.replace(/^data: /, '').trim();

        if (dataStr === '[DONE]') {
          onComplete();
          return;
        }

        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.error) {
            onError(parsed.error);
            return;
          }
          if (parsed.text) {
            onChunk(parsed.text);
          }
        } catch {
          // ignore incomplete json chunk in SSE stream
        }
      }
    }

    onComplete();
  } catch (error: any) {
    if (signal?.aborted) {
      onComplete();
      return;
    }
    console.error('Chat stream error:', error);
    onError(error.message || 'Failed to communicate with character');
  }
}

export async function enhanceCharacterDirectives(params: {
  idea: string;
  currentDirectives?: string;
  docsSummary?: string;
}): Promise<Partial<Character>> {
  const response = await fetch('/api/character/enhance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorJson.error || 'Failed to enhance directives');
  }

  return response.json();
}
