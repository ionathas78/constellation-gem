import React, { useState } from 'react';
import {
  FileText,
  Link as LinkIcon,
  HardDrive,
  RefreshCw,
  Trash2,
  Eye,
  CheckCircle2,
  ExternalLink,
  Plus,
  Loader2,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Sparkles,
  Search,
  FileEdit,
} from 'lucide-react';
import { Character, LinkedDoc } from '../types';
import { extractDocIdFromUrl, fetchGoogleDoc, SAMPLE_DOCS } from '../services/driveDocs';
import { GoogleSignInButton } from './GoogleSignInButton';
import { DrivePickerModal } from './DrivePickerModal';
import { DocPreviewModal } from './DocPreviewModal';
import { MemoryWriteConfirmModal } from './MemoryWriteConfirmModal';
import { User } from 'firebase/auth';

interface Props {
  user: User | null;
  accessToken: string | null;
  isLoggingIn: boolean;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  documents: LinkedDoc[];
  onAddDocument: (doc: LinkedDoc) => void;
  onUpdateDocument: (doc: LinkedDoc) => void;
  onRemoveDocument: (docId: string) => void;
  activeCharacter: Character;
  onToggleDocForCharacter: (docId: string) => void;
  onAppendDocument?: (docId: string, text: string, header: string) => Promise<void>;
}

export const GoogleDocsManager: React.FC<Props> = ({
  user,
  accessToken,
  isLoggingIn,
  onLogin,
  onLogout,
  documents,
  onAddDocument,
  onUpdateDocument,
  onRemoveDocument,
  activeCharacter,
  onToggleDocForCharacter,
  onAppendDocument,
}) => {
  const [docUrlInput, setDocUrlInput] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<LinkedDoc | null>(null);
  const [syncingDocId, setSyncingDocId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [writeTargetDoc, setWriteTargetDoc] = useState<LinkedDoc | null>(null);

  // Parse entered URL/ID
  const extractedId = extractDocIdFromUrl(docUrlInput);

  const handleImportByUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError(null);

    const docId = extractedId;
    if (!docId) {
      setUrlError('Please enter a valid Google Docs URL or Document ID.');
      return;
    }

    // Check if doc is already in library
    const existing = documents.find((d) => d.id === docId);
    if (existing) {
      // If it's already in library, just ensure it's linked to this character
      if (!activeCharacter.linkedDocIds.includes(docId)) {
        onToggleDocForCharacter(docId);
      }
      setDocUrlInput('');
      return;
    }

    if (!accessToken) {
      setUrlError('Please sign in with Google first to fetch documents from your Drive.');
      return;
    }

    setIsFetchingUrl(true);
    try {
      const fetched = await fetchGoogleDoc(docId, accessToken);
      onAddDocument(fetched);
      // Automatically link to active character
      if (!activeCharacter.linkedDocIds.includes(fetched.id)) {
        onToggleDocForCharacter(fetched.id);
      }
      setDocUrlInput('');
    } catch (err: any) {
      console.error('Fetch error:', err);
      setUrlError(
        err.message ||
          'Failed to load document. Make sure the document exists and your Google account has read access.'
      );
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleDrivePickerSelect = async (docId: string) => {
    if (!accessToken) return;
    const fetched = await fetchGoogleDoc(docId, accessToken);
    onAddDocument(fetched);
    if (!activeCharacter.linkedDocIds.includes(fetched.id)) {
      onToggleDocForCharacter(fetched.id);
    }
  };

  const handleResyncDoc = async (doc: LinkedDoc) => {
    if (doc.isSample) {
      return;
    }
    if (!accessToken) {
      setUrlError('Please sign in with Google to sync documents from Google Drive.');
      return;
    }
    setSyncingDocId(doc.id);
    try {
      const updated = await fetchGoogleDoc(doc.id, accessToken);
      onUpdateDocument({
        ...updated,
        docUsageInstructions: doc.docUsageInstructions,
        active: doc.active,
      });
    } catch (err: any) {
      console.error('Resync failed:', err);
      setUrlError(`Could not re-sync document "${doc.title}": ${err.message}`);
    } finally {
      setSyncingDocId(null);
    }
  };

  const handleAddSampleDoc = () => {
    const sample = SAMPLE_DOCS[0];
    if (!documents.some((d) => d.id === sample.id)) {
      onAddDocument(sample);
    }
    if (!activeCharacter.linkedDocIds.includes(sample.id)) {
      onToggleDocForCharacter(sample.id);
    }
  };

  const totalWords = documents
    .filter((d) => activeCharacter.linkedDocIds.includes(d.id) && d.active)
    .reduce((acc, d) => acc + (d.wordCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner: Google Account & Drive Status */}
      <div className="bg-gradient-to-r from-blue-950/40 via-zinc-900 to-indigo-950/30 border border-zinc-800/80 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-zinc-100">Google Drive & Docs Connection</h2>
                {user ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                    <CheckCircle2 className="w-3 h-3" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-950/60 text-amber-400 border border-amber-800/40">
                    Sign-in Required
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                {user
                  ? `Signed in as ${user.displayName || user.email}. You can link any Google Document from your Drive.`
                  : 'Connect your Google account to read your private Google Docs, world bibles, and lore manuscripts.'}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsDrivePickerOpen(true)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  Browse Drive Docs
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <GoogleSignInButton
                onClick={onLogin}
                isLoading={isLoggingIn}
                label="Connect Google Drive"
              />
            )}
          </div>
        </div>
      </div>

      {/* Import Section: Paste URL / Browse Drive / Sample */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-blue-400" />
            Link External Google Document
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Paste any Google Docs URL (e.g., https://docs.google.com/document/d/...) or raw Document ID.
          </p>
        </div>

        <form onSubmit={handleImportByUrl} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                value={docUrlInput}
                onChange={(e) => {
                  setDocUrlInput(e.target.value);
                  setUrlError(null);
                }}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-blue-500/80 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none transition-colors"
              />
              {extractedId && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-500 font-mono hidden md:block">
                  Detected ID: {extractedId.slice(0, 8)}...
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={isFetchingUrl || !docUrlInput.trim()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              {isFetchingUrl ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Reading Doc...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Link Document
                </>
              )}
            </button>
          </div>

          {urlError && (
            <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{urlError}</span>
            </div>
          )}
        </form>

        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-zinc-800/70 text-xs text-zinc-400 gap-3">
          <div className="flex items-center gap-2">
            <span>Want to test immediately?</span>
            <button
              type="button"
              onClick={handleAddSampleDoc}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition-colors border border-zinc-700 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Load Sample Solaris Lore Tome
            </button>
          </div>

          {user && (
            <button
              type="button"
              onClick={() => setIsDrivePickerOpen(true)}
              className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 underline underline-offset-2 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              Search & Pick from Drive
            </button>
          )}
        </div>
      </div>

      {/* Linked Documents Library */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              Linked Documents for {activeCharacter.name}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Toggled documents are directly injected into Gemini's system context when conversing with this character.
            </p>
          </div>

          <div className="text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active Lore: <strong className="text-zinc-200">{totalWords.toLocaleString()}</strong> words</span>
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="bg-zinc-900/60 border border-dashed border-zinc-800 rounded-2xl p-10 text-center">
            <FileText className="w-12 h-12 stroke-1 text-zinc-600 mx-auto mb-3" />
            <h4 className="text-sm font-medium text-zinc-300">No External Google Documents Linked Yet</h4>
            <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1 mb-4">
              Paste a link to your Google Doc or connect your Google Drive to browse your files. You can also load our sample fantasy lore tome above to start right away!
            </p>
            <button
              onClick={handleAddSampleDoc}
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg transition-colors border border-zinc-700"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Load Sample Lore Document
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {documents.map((doc) => {
              const isLinkedToThisChar = activeCharacter.linkedDocIds.includes(doc.id);
              const isSyncing = syncingDocId === doc.id;

              return (
                <div
                  key={doc.id}
                  className={`border rounded-xl p-4 transition-all ${
                    isLinkedToThisChar && doc.active
                      ? 'bg-zinc-900/90 border-indigo-500/40 shadow-sm'
                      : isLinkedToThisChar
                      ? 'bg-zinc-900/50 border-zinc-800 opacity-75'
                      : 'bg-zinc-950/40 border-zinc-850 opacity-60'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-zinc-100 truncate">{doc.title}</h4>
                          {doc.isSample && (
                            <span className="px-2 py-0.5 bg-amber-950/80 text-amber-300 border border-amber-800/40 rounded text-[10px] font-mono">
                              Sample Tome
                            </span>
                          )}
                          <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded text-[10px] font-mono">
                            {doc.wordCount.toLocaleString()} words
                          </span>
                        </div>

                        <p className="text-xs text-zinc-400 line-clamp-1 mt-1 font-mono">
                          {doc.text.slice(0, 160).replace(/[#*`]/g, '')}...
                        </p>

                        {doc.docUsageInstructions && (
                          <div className="mt-2 text-[11px] text-amber-300/90 bg-amber-950/30 border border-amber-900/40 px-2.5 py-1 rounded flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>Rule: {doc.docUsageInstructions}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions and Controls */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      {/* Character Association Toggle */}
                      <button
                        type="button"
                        onClick={() => onToggleDocForCharacter(doc.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                          isLinkedToThisChar
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                        }`}
                      >
                        <CheckCircle2 className={`w-3.5 h-3.5 ${isLinkedToThisChar ? 'text-white' : 'text-zinc-500'}`} />
                        {isLinkedToThisChar ? 'Linked to Character' : 'Link to Character'}
                      </button>

                      {/* Active in Prompt Toggle */}
                      {isLinkedToThisChar && (
                        <button
                          type="button"
                          onClick={() => onUpdateDocument({ ...doc, active: !doc.active })}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                            doc.active
                              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
                              : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                          }`}
                          title={doc.active ? 'Document is currently sent to Gemini' : 'Document is muted'}
                        >
                          {doc.active ? 'Active' : 'Muted'}
                        </button>
                      )}

                      {/* Inspect / Preview */}
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                        title="Inspect Extracted Text"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Append Memory / Note */}
                      {onAppendDocument && (
                        <button
                          type="button"
                          onClick={() => {
                            setWriteTargetDoc(doc);
                            setIsWriteModalOpen(true);
                          }}
                          className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                          title="Append memory note to document (requires explicit confirmation)"
                        >
                          <FileEdit className="w-4 h-4" />
                        </button>
                      )}

                      {/* External Google Docs Link */}
                      {doc.url && !doc.isSample && (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
                          title="Open in Google Docs"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}

                      {/* Re-sync */}
                      {!doc.isSample && (
                        <button
                          type="button"
                          onClick={() => handleResyncDoc(doc)}
                          disabled={isSyncing}
                          className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                          title="Sync fresh changes from Google Docs"
                        >
                          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
                        </button>
                      )}

                      {/* Delete */}
                      {confirmDeleteId === doc.id ? (
                        <div className="flex items-center gap-1 bg-red-950/80 border border-red-800/80 rounded-lg p-1">
                          <button
                            type="button"
                            onClick={() => {
                              onRemoveDocument(doc.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded text-[11px] font-medium"
                          >
                            Remove
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-1.5 py-0.5 text-zinc-400 hover:text-zinc-200 text-[11px]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(doc.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                          title="Unlink document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <DrivePickerModal
        isOpen={isDrivePickerOpen}
        onClose={() => setIsDrivePickerOpen(false)}
        accessToken={accessToken || ''}
        onSelectDocId={handleDrivePickerSelect}
        alreadyLinkedIds={documents.map((d) => d.id)}
      />

      <DocPreviewModal
        doc={previewDoc}
        onClose={() => setPreviewDoc(null)}
        onUpdateUsageInstructions={(docId, instructions) => {
          const doc = documents.find((d) => d.id === docId);
          if (doc) {
            onUpdateDocument({ ...doc, docUsageInstructions: instructions });
          }
        }}
      />

      {/* Memory Write Confirmation Modal */}
      <MemoryWriteConfirmModal
        isOpen={isWriteModalOpen}
        onClose={() => {
          setIsWriteModalOpen(false);
          setWriteTargetDoc(null);
        }}
        targetDocs={documents}
        defaultDocId={writeTargetDoc?.id}
        onConfirm={async (text, header, docId) => {
          if (onAppendDocument) {
            await onAppendDocument(docId, text, header);
          }
        }}
        title={writeTargetDoc ? `Append Memory to ${writeTargetDoc.title}` : 'Append Note to Document'}
      />
    </div>
  );
};
