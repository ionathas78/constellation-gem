import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Character, LinkedDoc } from './types';
import { PRESET_CHARACTERS } from './data/presetCharacters';
import { SAMPLE_DOCS, appendGoogleDoc } from './services/driveDocs';
import { initAuth, googleSignIn, logout, setCachedAccessToken } from './services/auth';
import { Header } from './components/Header';
import { CharacterChat } from './components/CharacterChat';
import { CharacterStudio } from './components/CharacterStudio';
import { GoogleDocsManager } from './components/GoogleDocsManager';
import { ConstellationEditorModal } from './components/ConstellationEditorModal';

const CHARACTERS_STORAGE_KEY = 'personacraft_characters_v1';
const DOCS_STORAGE_KEY = 'personacraft_docs_v1';
const ACTIVE_CHAR_STORAGE_KEY = 'personacraft_active_char_v1';

export default function App() {
  // Characters state
  const [characters, setCharacters] = useState<Character[]>(() => {
    try {
      const saved = localStorage.getItem(CHARACTERS_STORAGE_KEY);
      const remPreset = PRESET_CHARACTERS[0];
      if (saved) {
        const parsed: Character[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Replace or insert latest Rem preset so she always has her newest memory links and greeting
          const filtered = parsed.filter((c) => c.id !== 'rem');
          return [remPreset, ...filtered];
        }
      }
    } catch {
      // ignore
    }
    return PRESET_CHARACTERS;
  });

  const [activeCharacterId, setActiveCharacterId] = useState<string>('rem');

  // Linked Google Documents library
  const [documents, setDocuments] = useState<LinkedDoc[]>(() => {
    try {
      const saved = localStorage.getItem(DOCS_STORAGE_KEY);
      if (saved) {
        const parsed: LinkedDoc[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge in any missing Rem memory docs
          const existingIds = new Set(parsed.map((d) => d.id));
          const missing = SAMPLE_DOCS.filter((d) => !existingIds.has(d.id));
          return [...missing, ...parsed];
        }
      }
    } catch {
      // ignore
    }
    return SAMPLE_DOCS;
  });

  // Active navigation tab: 'chat' | 'studio' | 'docs'
  const [activeTab, setActiveTab] = useState<'chat' | 'studio' | 'docs'>('chat');

  // Constellation Spec Modal state
  const [isConstellationModalOpen, setIsConstellationModalOpen] = useState(false);

  // Google Authentication & Access Token State
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify(characters));
    } catch {
      // ignore
    }
  }, [characters]);

  useEffect(() => {
    try {
      localStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(documents));
    } catch {
      // ignore
    }
  }, [documents]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_CHAR_STORAGE_KEY, activeCharacterId);
    } catch {
      // ignore
    }
  }, [activeCharacterId]);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (authenticatedUser, token) => {
        setUser(authenticatedUser);
        setAccessToken(token);
        setNeedsAuth(false);
      },
      () => {
        // Needs sign-in to get OAuth token for Docs/Drive APIs
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setNeedsAuth(false);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setLoginError(err.message || 'Could not sign in with Google');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      setCachedAccessToken(null);
      setNeedsAuth(true);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // Find active character
  const activeCharacter =
    characters.find((c) => c.id === activeCharacterId) || characters[0] || PRESET_CHARACTERS[0];

  const handleUpdateCharacter = (updated: Character) => {
    setCharacters((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleCreateCharacter = () => {
    const newId = `char-${Date.now()}`;
    const newChar: Character = {
      id: newId,
      name: 'New Custom Persona',
      role: 'Companion & Scholar',
      avatar: '🎭',
      directives:
        'Engage naturally and charismatically with the user. Answer with curiosity and depth.',
      tone: 'Warm, thoughtful, articulate, and observant.',
      constraints:
        'Never break character. Never state that you are an AI or language model.',
      speechQuirks: 'Pauses thoughtfully before delivering profound insights.',
      greeting:
        '*looks up from an open parchment, offering a warm and welcoming nod*\n\nGreetings, traveler. Come, take a seat. What thoughts or inquiries bring you to me today?',
      suggestedPrompts: [
        'Tell me about your origins and history.',
        'What knowledge do you hold in your archives?',
      ],
      linkedDocIds: [],
      voicePitch: 1.0,
      voiceRate: 1.0,
      frameworkMode: 'constellation',
      createdAt: Date.now(),
    };
    setCharacters((prev) => [newChar, ...prev]);
    setActiveCharacterId(newId);
    setActiveTab('studio');
  };

  const handleDeleteCharacter = (id: string) => {
    const remaining = characters.filter((c) => c.id !== id);
    if (remaining.length > 0) {
      setCharacters(remaining);
      setActiveCharacterId(remaining[0].id);
    }
  };

  // Document Library handlers
  const handleAddDocument = (doc: LinkedDoc) => {
    setDocuments((prev) => {
      const filtered = prev.filter((d) => d.id !== doc.id);
      return [doc, ...filtered];
    });
  };

  const handleUpdateDocument = (updated: LinkedDoc) => {
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };

  const handleRemoveDocument = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    // Also remove from any character's linkedDocIds
    setCharacters((prev) =>
      prev.map((c) => ({
        ...c,
        linkedDocIds: (c.linkedDocIds || []).filter((id) => id !== docId),
      }))
    );
  };

  const handleToggleDocForCharacter = (docId: string) => {
    const current = activeCharacter.linkedDocIds || [];
    const next = current.includes(docId)
      ? current.filter((id) => id !== docId)
      : [...current, docId];
    handleUpdateCharacter({
      ...activeCharacter,
      linkedDocIds: next,
    });
  };

  const handleAppendMemoryDoc = async (docId: string, text: string, headerTitle?: string) => {
    try {
      const targetDoc = documents.find((d) => d.id === docId);

      // If user is logged into Google and this is an external Google Doc, write to Google Docs API
      if (accessToken && targetDoc && !targetDoc.isSample) {
        const result = await appendGoogleDoc(docId, accessToken, text, headerTitle);
        if (result.updatedDoc) {
          handleUpdateDocument(result.updatedDoc);
        }
        return;
      }

      // Otherwise update in the local document state with verified readback
      const timestamp = new Date().toISOString().split('T')[0];
      const textToInsert = headerTitle
        ? `\n\n### ${headerTitle} (${timestamp})\n${text.trim()}\n`
        : `\n\n${text.trim()}\n`;

      if (targetDoc) {
        const newText = targetDoc.text + textToInsert;
        const updated: LinkedDoc = {
          ...targetDoc,
          text: newText,
          wordCount: newText.trim().split(/\s+/).length,
          charCount: newText.length,
          fetchedAt: new Date().toISOString(),
        };
        handleUpdateDocument(updated);
      }
    } catch (err: any) {
      console.error('Failed to append memory doc:', err);
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-600/30 selection:text-indigo-200">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        characters={characters}
        activeCharacter={activeCharacter}
        onSelectCharacter={(c) => setActiveCharacterId(c.id)}
        user={user}
        onLogin={handleLogin}
        isLoggingIn={isLoggingIn}
        documents={documents}
        onOpenConstellationEditor={() => setIsConstellationModalOpen(true)}
      />

      {loginError && (
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-3">
          <div className="bg-red-950/80 border border-red-800/80 text-red-200 px-4 py-3 rounded-xl flex items-center justify-between text-xs">
            <span>{loginError}</span>
            <button
              onClick={() => setLoginError(null)}
              className="text-red-400 hover:text-red-200 underline ml-3 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        {activeTab === 'chat' && (
          <CharacterChat
            character={activeCharacter}
            documents={documents}
            onOpenStudio={() => setActiveTab('studio')}
            onOpenDocsTab={() => setActiveTab('docs')}
            onOpenConstellationEditor={() => setIsConstellationModalOpen(true)}
            onAppendMemoryDoc={handleAppendMemoryDoc}
          />
        )}

        {activeTab === 'studio' && (
          <CharacterStudio
            characters={characters}
            activeCharacter={activeCharacter}
            onSelectCharacter={(c) => setActiveCharacterId(c.id)}
            onUpdateCharacter={handleUpdateCharacter}
            onCreateCharacter={handleCreateCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            documents={documents}
            onOpenDocsTab={() => setActiveTab('docs')}
          />
        )}

        {activeTab === 'docs' && (
          <GoogleDocsManager
            user={user}
            accessToken={accessToken}
            isLoggingIn={isLoggingIn}
            onLogin={handleLogin}
            onLogout={handleLogout}
            documents={documents}
            onAddDocument={handleAddDocument}
            onUpdateDocument={handleUpdateDocument}
            onRemoveDocument={handleRemoveDocument}
            activeCharacter={activeCharacter}
            onToggleDocForCharacter={handleToggleDocForCharacter}
            onAppendDocument={handleAppendMemoryDoc}
          />
        )}
      </main>

      {/* Constellation Spec Editor Modal */}
      <ConstellationEditorModal
        isOpen={isConstellationModalOpen}
        onClose={() => setIsConstellationModalOpen(false)}
        character={activeCharacter}
        onSave={(updatedPersona) => {
          handleUpdateCharacter({
            ...activeCharacter,
            name: updatedPersona.name || activeCharacter.name,
            role: updatedPersona.tagline || activeCharacter.role,
            frameworkMode: 'constellation',
            constellationPersona: updatedPersona,
          });
        }}
      />
    </div>
  );
}
