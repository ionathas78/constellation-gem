import React from 'react';
import {
  MessageSquare,
  Sliders,
  FileText,
  Sparkles,
  HardDrive,
  Brain,
  ChevronDown,
  User as UserIcon,
} from 'lucide-react';
import { Character, LinkedDoc } from '../types';
import { User } from 'firebase/auth';
import { GoogleSignInButton } from './GoogleSignInButton';

interface Props {
  activeTab: 'chat' | 'studio' | 'docs';
  onTabChange: (tab: 'chat' | 'studio' | 'docs') => void;
  characters: Character[];
  activeCharacter: Character;
  onSelectCharacter: (char: Character) => void;
  user: User | null;
  onLogin: () => Promise<void>;
  isLoggingIn: boolean;
  documents: LinkedDoc[];
  onOpenConstellationEditor: () => void;
}

export const Header: React.FC<Props> = ({
  activeTab,
  onTabChange,
  characters,
  activeCharacter,
  onSelectCharacter,
  user,
  onLogin,
  isLoggingIn,
  documents,
  onOpenConstellationEditor,
}) => {
  const activeDocs = documents.filter((d) => activeCharacter.linkedDocIds?.includes(d.id) && d.active);

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & Character Quick Switcher */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-950/50">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-zinc-100">PersonaCraft</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-950/90 text-indigo-300 border border-indigo-800/60 hidden sm:inline-block">
                  Constellation
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden md:block">Drive Docs & Gemini Persona Studio</p>
            </div>
          </div>

          <div className="h-5 w-px bg-zinc-800 hidden sm:block" />

          {/* Quick Character Picker */}
          <div className="relative group">
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs font-medium text-zinc-200 transition-colors cursor-pointer"
            >
              <span>{activeCharacter.avatar || '🎭'}</span>
              <span className="max-w-[120px] sm:max-w-[160px] truncate">{activeCharacter.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            </button>

            <div className="absolute left-0 top-full mt-1.5 w-60 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-1.5 hidden group-hover:block hover:block z-50 animate-in fade-in duration-150">
              <div className="px-2.5 py-1 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                Select Active Character
              </div>
              {characters.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectCharacter(c)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-left transition-colors cursor-pointer ${
                    c.id === activeCharacter.id
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <span className="text-sm">{c.avatar || '🎭'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{c.name}</div>
                    <div className="text-[10px] text-zinc-400 truncate opacity-80">{c.role}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Main Navigation Tabs */}
        <nav className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800/80 text-xs">
          <button
            type="button"
            onClick={() => onTabChange('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('studio')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === 'studio'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Directives</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('docs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer relative ${
              activeTab === 'docs'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Google Docs</span>
            {activeDocs.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
            )}
          </button>
        </nav>

        {/* Right: Google Auth Status & Constellation Spec */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenConstellationEditor}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition-colors border border-zinc-800 hidden md:flex items-center gap-1.5 text-xs cursor-pointer"
            title="Inspect Constellation Persona Spec"
          >
            <Brain className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden lg:inline">Constellation Spec</span>
          </button>

          {user ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
              <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                {user.displayName ? user.displayName[0] : user.email ? user.email[0].toUpperCase() : 'G'}
              </div>
              <span className="text-zinc-300 max-w-[100px] truncate hidden sm:inline">
                {user.displayName || user.email}
              </span>
            </div>
          ) : (
            <GoogleSignInButton
              onClick={onLogin}
              isLoading={isLoggingIn}
              className="py-1.5 px-3 text-xs"
              label="Connect Drive"
            />
          )}
        </div>
      </div>
    </header>
  );
};
