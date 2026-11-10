import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Square,
  Sparkles,
  Volume2,
  VolumeX,
  RotateCcw,
  Download,
  Copy,
  Check,
  BookOpen,
  Sliders,
  FileText,
  AlertCircle,
  HelpCircle,
  Brain,
} from 'lucide-react';
import { Character, ChatMessage, LinkedDoc } from '../types';
import { streamCharacterChat } from '../services/geminiChat';
import { ConstellationLiveMonitor } from './ConstellationLiveMonitor';
import { MemoryWriteConfirmModal } from './MemoryWriteConfirmModal';
import { FileEdit, CheckCircle2 } from 'lucide-react';

interface Props {
  character: Character;
  documents: LinkedDoc[];
  onOpenStudio: () => void;
  onOpenDocsTab: () => void;
  onOpenConstellationEditor: () => void;
  onAppendMemoryDoc?: (docId: string, text: string, headerTitle?: string) => Promise<void>;
}

interface MemoryProposal {
  target: string;
  header: string;
  content: string;
}

function parseMemoryProposal(rawText: string): { cleanText: string; proposal: MemoryProposal | null } {
  const match = rawText.match(/:::memory_proposal\s*([\s\S]*?)\s*:::/);
  if (!match) return { cleanText: rawText, proposal: null };

  const cleanText = rawText.replace(/:::memory_proposal\s*[\s\S]*?\s*:::/, '').trim();
  try {
    const parsed = JSON.parse(match[1]);
    return {
      cleanText,
      proposal: {
        target: parsed.target || 'rem-scratchpad',
        header: parsed.header || 'Observation',
        content: parsed.content || '',
      },
    };
  } catch {
    return { cleanText, proposal: null };
  }
}

export const CharacterChat: React.FC<Props> = ({
  character,
  documents,
  onOpenStudio,
  onOpenDocsTab,
  onOpenConstellationEditor,
  onAppendMemoryDoc,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [autoSpeech, setAutoSpeech] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showGroundingDrawer, setShowGroundingDrawer] = useState(false);

  // Memory write confirm modal state
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [writeModalParams, setWriteModalParams] = useState<{
    text: string;
    header: string;
    docId: string;
  }>({
    text: '',
    header: 'Observation',
    docId: 'rem-scratchpad',
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Active documents linked to this character
  const activeDocs = documents.filter(
    (d) => character.linkedDocIds?.includes(d.id) && d.active
  );

  const totalWords = activeDocs.reduce((acc, d) => acc + (d.wordCount || 0), 0);

  // Reset or initialize messages when character changes
  useEffect(() => {
    // Check if character has a greeting
    if (character.greeting) {
      setMessages([
        {
          id: `greeting-${character.id}`,
          role: 'model',
          text: character.greeting,
          timestamp: Date.now(),
        },
      ]);
    } else {
      setMessages([]);
    }
  }, [character.id]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Audio Speech Synthesis
  const speakText = (text: string, msgId: string) => {
    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      window.speechSynthesis.cancel();
      if (currentlySpeakingId === msgId) {
        setCurrentlySpeakingId(null);
        return;
      }

      // Strip roleplay asterisks for cleaner audio
      const speechCleanText = text.replace(/\*[^*]+\*/g, '').trim() || text;
      const utterance = new SpeechSynthesisUtterance(speechCleanText);
      utterance.pitch = character.voicePitch || 1.0;
      utterance.rate = character.voiceRate || 1.0;

      utterance.onend = () => setCurrentlySpeakingId(null);
      utterance.onerror = () => setCurrentlySpeakingId(null);

      setCurrentlySpeakingId(msgId);
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis unavailable or blocked:', err);
      setCurrentlySpeakingId(null);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isStreaming) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: Date.now(),
    };

    const assistantPlaceholderId = `assistant-${Date.now()}`;
    const assistantMsg: ChatMessage = {
      id: assistantPlaceholderId,
      role: 'model',
      text: '',
      timestamp: Date.now(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages([...nextMessages, assistantMsg]);
    setInput('');
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let accumulatedText = '';

    await streamCharacterChat({
      character,
      documents,
      messages: nextMessages,
      onChunk: (chunk) => {
        accumulatedText += chunk;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantPlaceholderId ? { ...m, text: accumulatedText } : m))
        );
      },
      onError: (err) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantPlaceholderId
              ? { ...m, text: accumulatedText || `[Error: ${err}]`, error: true }
              : m
          )
        );
        setIsStreaming(false);
      },
      onComplete: () => {
        setIsStreaming(false);
        abortControllerRef.current = null;
        if (autoSpeech && accumulatedText) {
          speakText(accumulatedText, assistantPlaceholderId);
        }
      },
      signal: controller.signal,
    });
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    const { cleanText } = parseMemoryProposal(text);
    const textToCopy = cleanText.trim() || text;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(textToCopy).catch((err) => {
        console.warn('Clipboard write blocked or failed:', err);
      });
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    if (character.greeting) {
      setMessages([
        {
          id: `greeting-${Date.now()}`,
          role: 'model',
          text: character.greeting,
          timestamp: Date.now(),
        },
      ]);
    } else {
      setMessages([]);
    }
  };

  const handleExportChat = () => {
    const transcript = messages
      .map(
        (m) =>
          `**${m.role === 'user' ? 'You' : character.name}** (${new Date(
            m.timestamp
          ).toLocaleTimeString()}):\n${m.text}\n`
      )
      .join('\n---\n\n');

    const blob = new Blob([transcript], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${character.name.toLowerCase().replace(/\s+/g, '-')}-transcript.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Formats roleplay actions wrapped in asterisks (*action*) with italicized luminous styling
   */
  const renderMessageContent = (text: string) => {
    if (!text) return null;

    // Split text by asterisks *...* to style physical actions/expressions
    const parts = text.split(/(\*[^*]+\*)/g);

    return (
      <div className="space-y-2 whitespace-pre-wrap leading-relaxed">
        {parts.map((part, i) => {
          if (part.startsWith('*') && part.endsWith('*')) {
            const inner = part.slice(1, -1);
            return (
              <span key={i} className="text-amber-300/90 italic font-serif text-[13.5px]">
                *{inner}*
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[580px] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Top Bar */}
      <div className="px-5 py-3.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-850 flex items-center justify-center text-2xl shrink-0 shadow-sm">
            {character.avatar || '🎭'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-100 truncate">{character.name}</h2>
              {character.frameworkMode === 'constellation' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                  <Brain className="w-3 h-3 text-indigo-400" />
                  Constellation
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-400">
                  Standard Persona
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 truncate mt-0.5">{character.role}</p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Quick Note to Scratchpad */}
          <button
            type="button"
            onClick={() => {
              setWriteModalParams({
                text: '',
                header: 'Observation',
                docId: 'rem-scratchpad',
              });
              setIsWriteModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-950/60 hover:bg-blue-900/70 border border-blue-500/40 text-blue-300 transition-colors cursor-pointer shadow-sm"
            title="Record note to Rem's Scratchpad in Google Drive"
          >
            <FileEdit className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Note to Scratchpad</span>
          </button>

          {/* Grounding Info Badge */}
          <button
            type="button"
            onClick={() => setShowGroundingDrawer(!showGroundingDrawer)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
              activeDocs.length > 0
                ? 'bg-blue-950/40 border-blue-500/30 text-blue-300 hover:bg-blue-900/60'
                : 'bg-zinc-850 border-zinc-750 text-zinc-400 hover:bg-zinc-800'
            }`}
            title="Inspect Grounding Documents"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">
              {activeDocs.length > 0
                ? `${activeDocs.length} Google Doc${activeDocs.length > 1 ? 's' : ''} (${totalWords.toLocaleString()} w)`
                : 'No Docs Linked'}
            </span>
            <span className="sm:hidden">{activeDocs.length} Docs</span>
          </button>

          {/* Auto Read-aloud Toggle */}
          <button
            type="button"
            onClick={() => setAutoSpeech(!autoSpeech)}
            className={`p-2 rounded-lg text-xs transition-colors cursor-pointer border ${
              autoSpeech
                ? 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                : 'bg-zinc-850 border-zinc-750 text-zinc-400 hover:text-zinc-200'
            }`}
            title={autoSpeech ? 'Auto-Voice Enabled' : 'Auto-Voice Muted'}
          >
            {autoSpeech ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Chat Actions */}
          <button
            type="button"
            onClick={handleExportChat}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-800 cursor-pointer hidden sm:block"
            title="Export Transcript (Markdown)"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleClearChat}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-800 cursor-pointer"
            title="Clear Chat History"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Constellation Live Telemetry Bar */}
      <div className="px-5 py-2 bg-zinc-950 border-b border-zinc-850 shrink-0">
        <ConstellationLiveMonitor
          character={character}
          activeDocs={activeDocs}
          onOpenConstellationEditor={onOpenConstellationEditor}
        />
      </div>

      {/* Grounding Inspector Drawer (collapsible) */}
      {showGroundingDrawer && (
        <div className="px-5 py-3 bg-zinc-900/90 border-b border-zinc-800 text-xs animate-in slide-in-from-top-2 duration-150 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              Active External Documents Feeding Character Memory:
            </span>
            <button
              onClick={onOpenDocsTab}
              className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
            >
              + Add / Manage Documents
            </button>
          </div>
          {activeDocs.length === 0 ? (
            <p className="text-zinc-500">
              No documents currently linked to {character.name}. Go to the "Google Docs & Drive" tab to connect Google Docs or load our sample lore tome!
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {activeDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg flex items-center gap-2 text-zinc-300"
                >
                  <FileText className="w-3 h-3 text-blue-400" />
                  <span className="font-medium">{doc.title}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">({doc.wordCount.toLocaleString()} words)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isSpeaking = currentlySpeakingId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 shadow-sm border ${
                  isUser
                    ? 'bg-blue-600 border-blue-500 text-white font-semibold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-200'
                }`}
              >
                {isUser ? 'You' : character.avatar || '🎭'}
              </div>

              {/* Message Bubble */}
              <div
                onClick={(e) => {
                  // Ignore clicks on inner interactive elements like buttons, links, etc.
                  if ((e.target as HTMLElement).closest('button, a, input, textarea')) return;
                  // If user has selected text in the bubble, do not copy automatically
                  const sel = window.getSelection();
                  if (sel && sel.toString().trim().length > 0) return;

                  handleCopyMessage(msg.id, msg.text);
                }}
                title="Click bubble to copy text"
                className={`group relative rounded-2xl px-4 py-3 text-sm shadow-sm transition-all cursor-pointer hover:ring-1 hover:ring-indigo-500/40 select-text ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-sm hover:bg-blue-600/95 pr-9'
                    : msg.error
                    ? 'bg-red-950/70 border border-red-800 text-red-200 rounded-tl-sm hover:border-red-700'
                    : 'bg-zinc-900/90 border border-zinc-800 text-zinc-100 rounded-tl-sm hover:border-zinc-700 hover:bg-zinc-900 pr-9'
                }`}
              >
                {/* Floating "Copied!" Badge */}
                {copiedId === msg.id && (
                  <div className="absolute -top-3.5 right-3 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-medium shadow-md flex items-center gap-1 animate-in fade-in zoom-in-95 pointer-events-none z-10">
                    <Check className="w-3 h-3" />
                    <span>Copied!</span>
                  </div>
                )}

                {/* Quick copy hover button in top right corner */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyMessage(msg.id, msg.text);
                  }}
                  className={`absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer ${
                    isUser
                      ? 'bg-blue-700/80 hover:bg-blue-800 text-blue-100'
                      : 'bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300'
                  }`}
                  title="Copy text"
                >
                  {copiedId === msg.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Content */}
                {isUser ? (
                  <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                ) : (
                  (() => {
                    const { cleanText, proposal } = parseMemoryProposal(msg.text);
                    const targetDocObj = documents.find((d) => d.id === proposal?.target) || documents[0];
                    return (
                      <>
                        {renderMessageContent(cleanText)}
                        {proposal && (
                          <div className="mt-3 p-3 bg-blue-950/40 border border-blue-500/30 rounded-xl text-xs space-y-2">
                            <div className="flex items-center gap-1.5 text-blue-300 font-semibold text-[11px]">
                              <FileEdit className="w-3.5 h-3.5 text-blue-400" />
                              <span>Rem proposed recording to {targetDocObj?.title || proposal.target}:</span>
                            </div>
                            <p className="text-zinc-200 font-medium">{proposal.header}</p>
                            <p className="text-zinc-400 text-[11px] font-mono bg-zinc-950/70 p-2 rounded border border-zinc-800">
                              {proposal.content}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setWriteModalParams({
                                  text: proposal.content,
                                  header: proposal.header,
                                  docId: proposal.target,
                                });
                                setIsWriteModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Review & Confirm Write to Drive
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()
                )}

                {/* Footer Controls on Character Message */}
                {!isUser && !msg.error && (
                  <div className="flex items-center gap-2 mt-2 pt-1 border-t border-zinc-800/60 opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-zinc-400">
                    <button
                      type="button"
                      onClick={() => speakText(msg.text, msg.id)}
                      className="hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'text-amber-400 animate-pulse' : ''}`} />
                      <span>{isSpeaking ? 'Playing...' : 'Read Aloud'}</span>
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(msg.id, msg.text)}
                      className="hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    {activeDocs.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-blue-400/80 flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          Grounded
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isStreaming && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 py-1 pl-11">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            <span>{character.name} is composing a response...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts Pills (if any) */}
      {(character.suggestedPrompts || []).length > 0 && messages.length <= 2 && (
        <div className="px-5 py-2 bg-zinc-950/80 border-t border-zinc-850 flex items-center gap-2 overflow-x-auto shrink-0">
          <span className="text-[11px] font-medium text-zinc-500 shrink-0">Test inquiries:</span>
          {character.suggestedPrompts.map((prompt, i) => (
            <button
              key={i}
              type="button"
              disabled={isStreaming}
              onClick={() => handleSend(prompt)}
              className="px-3 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs transition-colors shrink-0 cursor-pointer disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input Composer */}
      <div className="p-4 bg-zinc-900 border-t border-zinc-800 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-end gap-2"
        >
          <div className="relative flex-1 bg-zinc-950 border border-zinc-800 focus-within:border-indigo-500/80 rounded-2xl shadow-inner transition-colors">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Interact with ${character.name}... (Press Enter to send, Shift+Enter for new line)`}
              className="w-full bg-transparent px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none resize-none max-h-32 min-h-[44px]"
            />
          </div>

          {isStreaming ? (
            <button
              type="button"
              onClick={handleStop}
              className="w-11 h-11 rounded-2xl bg-red-600/90 hover:bg-red-500 text-white flex items-center justify-center transition-colors shadow-sm shrink-0 cursor-pointer"
              title="Stop Generation"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-11 h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white flex items-center justify-center transition-all shadow-sm shrink-0 cursor-pointer active:scale-95"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>

      {/* Memory Write Confirmation Modal */}
      <MemoryWriteConfirmModal
        isOpen={isWriteModalOpen}
        onClose={() => setIsWriteModalOpen(false)}
        onConfirm={async (text, header, docId) => {
          if (onAppendMemoryDoc) {
            await onAppendMemoryDoc(docId, text, header);
            const targetDocObj = documents.find((d) => d.id === docId);
            const confirmMsg: ChatMessage = {
              id: `confirm-${Date.now()}`,
              role: 'model',
              text: `*records note in ${targetDocObj?.title || 'memory file'} with readback verification*\n\n"Rem has added that note to our records on Google Drive, dear. 💙"`,
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, confirmMsg]);
          }
        }}
        targetDocs={documents}
        defaultDocId={writeModalParams.docId}
        initialText={writeModalParams.text}
        initialHeader={writeModalParams.header}
        title="Record Memory to Google Drive"
      />
    </div>
  );
};
