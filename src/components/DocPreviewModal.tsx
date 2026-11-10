import React, { useState } from 'react';
import { X, ExternalLink, Copy, Check, FileText, Sparkles } from 'lucide-react';
import { LinkedDoc } from '../types';

interface Props {
  doc: LinkedDoc | null;
  onClose: () => void;
  onUpdateUsageInstructions?: (docId: string, instructions: string) => void;
}

export const DocPreviewModal: React.FC<Props> = ({
  doc,
  onClose,
  onUpdateUsageInstructions,
}) => {
  const [copied, setCopied] = useState(false);
  const [instructions, setInstructions] = useState(doc?.docUsageInstructions || '');
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);

  if (!doc) return null;

  const handleCopy = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(doc.text).catch((err) => {
        console.warn('Clipboard write failed:', err);
      });
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveInstructions = () => {
    if (onUpdateUsageInstructions) {
      onUpdateUsageInstructions(doc.id, instructions);
    }
    setIsEditingInstructions(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-zinc-100 truncate">{doc.title}</h2>
              <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
                <span>{doc.wordCount.toLocaleString()} words</span>
                <span>•</span>
                <span>{doc.charCount.toLocaleString()} characters</span>
                <span>•</span>
                <span>Synced {new Date(doc.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {doc.url && !doc.isSample && (
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition-colors"
                title="Open in Google Docs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Google Docs
              </a>
            )}
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Text'}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Character usage prompt banner */}
        <div className="px-6 py-3 bg-zinc-950/60 border-b border-zinc-800/80">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-zinc-300">How the Character should use this document:</p>
                {isEditingInstructions ? (
                  <div className="mt-2 space-y-2">
                    <input
                      type="text"
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="e.g., Treat this as your primary rulebook; never contradict it."
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-400/70"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveInstructions}
                        className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded text-xs"
                      >
                        Save Directive
                      </button>
                      <button
                        onClick={() => setIsEditingInstructions(false)}
                        className="px-2 py-1 text-zinc-400 hover:text-zinc-200 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 italic mt-0.5">
                    {instructions || 'No specific document directive provided. Used as general contextual grounding.'}
                  </p>
                )}
              </div>
            </div>
            {!isEditingInstructions && onUpdateUsageInstructions && (
              <button
                onClick={() => setIsEditingInstructions(true)}
                className="text-xs text-amber-400/90 hover:text-amber-300 underline shrink-0 cursor-pointer"
              >
                {instructions ? 'Edit Rule' : '+ Add Doc Directive'}
              </button>
            )}
          </div>
        </div>

        {/* Document content viewer */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-950 font-mono text-xs leading-relaxed text-zinc-300 select-text whitespace-pre-wrap">
          {doc.text || <span className="text-zinc-600 italic">This document is empty.</span>}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900 flex justify-between items-center text-xs text-zinc-500">
          <span className="font-mono text-[11px]">ID: {doc.id}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
