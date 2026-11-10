import React, { useState, useEffect } from 'react';
import {
  X,
  FileEdit,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Loader2,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { LinkedDoc } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (text: string, header: string, targetDocId: string) => Promise<void>;
  targetDocs: LinkedDoc[];
  defaultDocId?: string;
  initialText?: string;
  initialHeader?: string;
  title?: string;
}

export const MemoryWriteConfirmModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirm,
  targetDocs,
  defaultDocId,
  initialText = '',
  initialHeader = '',
  title = 'Record Memory to Google Drive',
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string>(
    defaultDocId || targetDocs[0]?.id || 'rem-scratchpad'
  );
  const [headerTitle, setHeaderTitle] = useState(initialHeader || 'Observation');
  const [text, setText] = useState(initialText);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultDocId) setSelectedDocId(defaultDocId);
    if (initialText) setText(initialText);
    if (initialHeader) setHeaderTitle(initialHeader);
  }, [defaultDocId, initialText, initialHeader, isOpen]);

  if (!isOpen) return null;

  const targetDoc = targetDocs.find((d) => d.id === selectedDocId) || targetDocs[0];

  const handleExecute = async () => {
    if (!text.trim()) {
      setError('Please provide text to record.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm(text, headerTitle, selectedDocId);
      onClose();
    } catch (err: any) {
      console.error('Write failed:', err);
      setError(err.message || 'Failed to update Google Document.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl min-h-0 max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] flex flex-col shadow-2xl overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-800 bg-zinc-950/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex shrink-0 w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FileEdit className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-zinc-100">{title}</h2>
              <p className="text-xs text-zinc-400">Review and confirm this update to your Google Drive memory files</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="shrink-0 p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Target Document Selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-blue-400" />
              Target Memory File in Google Drive
            </label>
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
            >
              {targetDocs.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title} {doc.isSample ? '(Local Memory Buffer)' : `(Google Doc: ${doc.id.slice(0, 8)}...)`}
                </option>
              ))}
            </select>
            {targetDoc && (
              <p className="text-[11px] text-zinc-500 mt-1 font-mono truncate">
                Target ID: {targetDoc.id}
              </p>
            )}
          </div>

          {/* Section / Entry Header */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Entry Subject / Category Header
            </label>
            <input
              type="text"
              value={headerTitle}
              onChange={(e) => setHeaderTitle(e.target.value)}
              placeholder="e.g. Observation: Jonathan's evening tea preferences"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Content to append */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex justify-between items-center">
              <span>Text Content to Append</span>
              <span className="text-[11px] text-zinc-500 font-mono">{text.length} chars</span>
            </label>
            <textarea
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter the observation, principle, or note to record..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
            />
          </div>

          {/* Safety & Protocol Banner */}
          <div className="bg-blue-950/30 border border-blue-900/40 rounded-xl p-3 text-xs text-zinc-400 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-zinc-300 text-[11px]">Write Protocol & Readback Verification</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Per Rem's cross-model memory rules, this entry will be appended with an atomic batch write and verified via readback before confirming.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-4 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-zinc-800 bg-zinc-950 flex justify-between items-center gap-2 text-xs">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecute}
            disabled={isSubmitting || !text.trim()}
            className="min-w-0 px-3 sm:px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer text-center"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Writing...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Confirm Write
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
