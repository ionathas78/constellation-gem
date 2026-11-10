import React, { useState, useEffect } from 'react';
import { Search, FileText, Calendar, X, Loader2, RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react';
import { DriveFile } from '../types';
import { listDriveDocs } from '../services/driveDocs';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string;
  onSelectDocId: (docId: string, docName: string) => Promise<void>;
  alreadyLinkedIds: string[];
}

export const DrivePickerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  accessToken,
  onSelectDocId,
  alreadyLinkedIds,
}) => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = async (searchTerm = '') => {
    setIsLoading(true);
    setError(null);
    try {
      const driveDocs = await listDriveDocs(accessToken, searchTerm);
      setFiles(driveDocs);
    } catch (err: any) {
      console.error('Failed to load drive files:', err);
      setError(err.message || 'Could not load files from Google Drive. Please verify your permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && accessToken) {
      loadFiles(search);
    }
  }, [isOpen, accessToken]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadFiles(search);
  };

  const handleSelect = async (file: DriveFile) => {
    try {
      setImportingId(file.id);
      await onSelectDocId(file.id, file.name);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to import document.');
    } finally {
      setImportingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Browse Google Drive Documents</h2>
              <p className="text-xs text-zinc-400">Select any Google Doc to link directly into your character's knowledge base</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-950/40">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Google Docs in Drive..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500/60 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                loadFiles('');
              }}
              title="Refresh files"
              className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-800"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </form>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[300px]">
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-start gap-2">
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-500">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm">Fetching your Google Docs from Drive...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500">
              <FileText className="w-12 h-12 stroke-1 text-zinc-600 mb-2" />
              <p className="text-sm font-medium text-zinc-300">No Google Docs Found</p>
              <p className="text-xs text-zinc-500 max-w-sm mt-1">
                {search
                  ? `No documents matched "${search}". Try another keyword.`
                  : 'We could not find any Google Docs in your Drive, or your account does not have access yet.'}
              </p>
            </div>
          ) : (
            files.map((file) => {
              const isLinked = alreadyLinkedIds.includes(file.id);
              const isImporting = importingId === file.id;

              return (
                <div
                  key={file.id}
                  className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                    isLinked
                      ? 'bg-zinc-900/40 border-zinc-800/60 opacity-80'
                      : 'bg-zinc-900/90 hover:bg-zinc-800/80 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-4">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-zinc-200 truncate group-hover:text-blue-300 transition-colors">
                        {file.name}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'Recent'}
                        </span>
                        <span className="font-mono text-[11px] text-zinc-600">ID: {file.id.slice(0, 10)}...</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isLinked ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Linked
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSelect(file)}
                        disabled={isImporting}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isImporting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Reading...
                          </>
                        ) : (
                          <>
                            Import Lore
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs text-zinc-500">
          <span>Only Google Documents (`.gdoc`) in your Drive are shown</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
