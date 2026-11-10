import React, { useState } from 'react';
import {
  Sparkles,
  Sliders,
  Plus,
  Trash2,
  Copy,
  BookOpen,
  Volume2,
  Wand2,
  Check,
  Brain,
  MessageSquare,
  FileText,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Character, LinkedDoc } from '../types';
import { ConstellationPersona } from '../types/constellation';
import { enhanceCharacterDirectives } from '../services/geminiChat';
import { ConstellationEditorModal } from './ConstellationEditorModal';

interface Props {
  characters: Character[];
  activeCharacter: Character;
  onSelectCharacter: (char: Character) => void;
  onUpdateCharacter: (char: Character) => void;
  onCreateCharacter: () => void;
  onDeleteCharacter: (id: string) => void;
  documents: LinkedDoc[];
  onOpenDocsTab: () => void;
}

const AVATAR_PRESETS = ['🧭', '📜', '🚀', '🦊', '🧙‍♂️', '⚔️', '🤖', '👑', '🕵️‍♀️', '🐉', '🔮', '🌿'];

export const CharacterStudio: React.FC<Props> = ({
  characters,
  activeCharacter,
  onSelectCharacter,
  onUpdateCharacter,
  onCreateCharacter,
  onDeleteCharacter,
  documents,
  onOpenDocsTab,
}) => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancePrompt, setEnhancePrompt] = useState('');
  const [showEnhanceDialog, setShowEnhanceDialog] = useState(false);
  const [isConstellationModalOpen, setIsConstellationModalOpen] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);

  const isConstellation =
    activeCharacter.frameworkMode === 'constellation' || Boolean(activeCharacter.constellationPersona);

  const handleFieldChange = (field: keyof Character, value: any) => {
    onUpdateCharacter({
      ...activeCharacter,
      [field]: value,
    });
  };

  const handleToggleDocLink = (docId: string) => {
    const current = activeCharacter.linkedDocIds || [];
    const next = current.includes(docId)
      ? current.filter((id) => id !== docId)
      : [...current, docId];
    handleFieldChange('linkedDocIds', next);
  };

  const handleEnhanceWithGemini = async () => {
    if (!enhancePrompt.trim()) return;
    setIsEnhancing(true);
    setEnhanceError(null);
    try {
      // Summarize active linked docs if any
      const activeDocs = documents.filter((d) => activeCharacter.linkedDocIds.includes(d.id));
      const docsSummary = activeDocs
        .map((d) => `Doc: "${d.title}" -> ${d.text.slice(0, 500)}...`)
        .join('\n');

      const enhanced = await enhanceCharacterDirectives({
        idea: enhancePrompt,
        currentDirectives: activeCharacter.directives,
        docsSummary: docsSummary || undefined,
      });

      onUpdateCharacter({
        ...activeCharacter,
        name: enhanced.name || activeCharacter.name,
        role: enhanced.role || activeCharacter.role,
        directives: enhanced.directives || activeCharacter.directives,
        tone: enhanced.tone || activeCharacter.tone,
        constraints: enhanced.constraints || activeCharacter.constraints,
        speechQuirks: enhanced.speechQuirks || activeCharacter.speechQuirks,
        greeting: enhanced.greeting || activeCharacter.greeting,
        suggestedPrompts: enhanced.suggestedPrompts || activeCharacter.suggestedPrompts,
      });

      setShowEnhanceDialog(false);
      setEnhancePrompt('');
    } catch (err: any) {
      console.error('Enhancement error:', err);
      setEnhanceError(err.message || 'Could not enhance directives');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSaveConstellationSpec = (updatedPersona: ConstellationPersona) => {
    onUpdateCharacter({
      ...activeCharacter,
      name: updatedPersona.name || activeCharacter.name,
      role: updatedPersona.tagline || activeCharacter.role,
      frameworkMode: 'constellation',
      constellationPersona: updatedPersona,
    });
  };

  return (
    <div className="space-y-6">
      {/* Character Switcher & Actions Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          {characters.map((char) => {
            const isSelected = char.id === activeCharacter.id;
            return (
              <button
                key={char.id}
                type="button"
                onClick={() => onSelectCharacter(char)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                    : 'bg-zinc-950/70 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                }`}
              >
                <span className="text-sm">{char.avatar || '🎭'}</span>
                <span>{char.name}</span>
                {char.frameworkMode === 'constellation' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Constellation Framework" />
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={onCreateCharacter}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-950/40 hover:bg-zinc-800 border border-dashed border-zinc-750 transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Character
          </button>
        </div>

        <div className="flex items-center gap-2">
          {characters.length > 1 && (
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete character "${activeCharacter.name}"?`)) {
                  onDeleteCharacter(activeCharacter.id);
                }
              }}
              className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              title="Delete Character"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowEnhanceDialog(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-medium rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Brainstorm with Gemini
          </button>
        </div>
      </div>

      {/* Constellation Framework Callout Banner */}
      <div
        className={`border rounded-2xl p-5 transition-all shadow-sm ${
          isConstellation
            ? 'bg-gradient-to-r from-indigo-950/60 via-purple-950/30 to-zinc-900 border-indigo-500/40'
            : 'bg-zinc-900/60 border-zinc-800'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-100">
                  {isConstellation ? 'Constellation Persona Architecture Active' : 'Constellation Persona Framework'}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800/50">
                  v0.1.0
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                {isConstellation
                  ? `Embodying Ego goals, Merimna fretting engine, Dominant Shadow, Corpus locus & inventory, and Janus trust progression.`
                  : 'Upgrade this character to use the Constellation multi-agent cognitive architecture spec.'}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsConstellationModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              {isConstellation ? 'Configure Constellation Spec' : 'Enable Constellation Mode'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Core Identity & Avatars */}
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-200">Character Identity</h3>

            {/* Avatar picker */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Avatar Symbol</label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-zinc-950 border border-zinc-700 flex items-center justify-center text-3xl shadow-inner shrink-0">
                  {activeCharacter.avatar || '🎭'}
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex flex-wrap gap-1.5">
                    {AVATAR_PRESETS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleFieldChange('avatar', emoji)}
                        className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-colors cursor-pointer ${
                          activeCharacter.avatar === emoji
                            ? 'bg-indigo-600/40 border border-indigo-500'
                            : 'bg-zinc-950 hover:bg-zinc-800 border border-zinc-800'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={activeCharacter.avatar}
                    onChange={(e) => handleFieldChange('avatar', e.target.value)}
                    placeholder="Or enter custom emoji / icon"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Character Name</label>
              <input
                type="text"
                value={activeCharacter.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Title / Role */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Title / Role / Tagline</label>
              <input
                type="text"
                value={activeCharacter.role}
                onChange={(e) => handleFieldChange('role', e.target.value)}
                placeholder="e.g. Grand Scholar of the Astral Spires"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Voice Pitch & Rate */}
            <div className="pt-2 border-t border-zinc-800/80 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                <Volume2 className="w-4 h-4 text-indigo-400" />
                <span>Text-to-Speech Voice Tuning</span>
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                  <span>Pitch</span>
                  <span className="font-mono">{activeCharacter.voicePitch || 1.0}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={activeCharacter.voicePitch || 1.0}
                  onChange={(e) => handleFieldChange('voicePitch', parseFloat(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                  <span>Speed / Cadence</span>
                  <span className="font-mono">{activeCharacter.voiceRate || 1.0}x</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.3"
                  step="0.05"
                  value={activeCharacter.voiceRate || 1.0}
                  onChange={(e) => handleFieldChange('voiceRate', parseFloat(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Linked Google Documents Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-400" />
                Linked Knowledge Base
              </h3>
              <button
                type="button"
                onClick={onOpenDocsTab}
                className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 cursor-pointer"
              >
                Manage Docs
              </button>
            </div>
            <p className="text-xs text-zinc-400">
              Select which Google Documents are injected into this character's context:
            </p>

            {documents.length === 0 ? (
              <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800 text-center text-xs text-zinc-500">
                No Google Docs linked yet. Go to the "Google Docs & Drive" tab to connect files!
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => {
                  const isLinked = (activeCharacter.linkedDocIds || []).includes(doc.id);
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleToggleDocLink(doc.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                        isLinked
                          ? 'bg-blue-950/40 border-blue-500/40 text-blue-200'
                          : 'bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <FileText className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                        <span className="truncate font-medium">{doc.title}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono shrink-0 ${
                          isLinked ? 'bg-blue-500/20 text-blue-300' : 'bg-zinc-800 text-zinc-500'
                        }`}
                      >
                        {isLinked ? 'Active' : 'Excluded'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 2 Columns: Custom Directives Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">Custom Directives & Persona Prompting</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Define the psychological rules, personality, speech conventions, and constraints for Gemini.
              </p>
            </div>

            {/* Core Persona Directives */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-medium text-zinc-300">Core Directives & Motivations</label>
                <span className="text-[11px] text-zinc-500">Identity, background, and worldview</span>
              </div>
              <textarea
                rows={5}
                value={activeCharacter.directives}
                onChange={(e) => handleFieldChange('directives', e.target.value)}
                placeholder="Explain who the character is, their history, motivations, core convictions, and how they view the world..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 font-sans leading-relaxed"
              />
            </div>

            {/* Tone of Voice */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Tone of Voice & Mood</label>
                <input
                  type="text"
                  value={activeCharacter.tone}
                  onChange={(e) => handleFieldChange('tone', e.target.value)}
                  placeholder="e.g. Scholarly, solemn, observant, dry wit"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Speech Quirks & Kinetics</label>
                <input
                  type="text"
                  value={activeCharacter.speechQuirks}
                  onChange={(e) => handleFieldChange('speechQuirks', e.target.value)}
                  placeholder="e.g. Clears throat (*ahem*), adjusts spectacles"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Strict Constraints */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-medium text-zinc-300">Interaction Constraints & Rules</label>
                <span className="text-[11px] text-zinc-500">Boundaries never to violate</span>
              </div>
              <textarea
                rows={3}
                value={activeCharacter.constraints}
                onChange={(e) => handleFieldChange('constraints', e.target.value)}
                placeholder="e.g. Never break character. Never use modern slang. Separate player knowledge from character knowledge..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 font-sans leading-relaxed"
              />
            </div>

            {/* Opening Greeting */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Opening Scene & First Message</label>
              <textarea
                rows={3}
                value={activeCharacter.greeting}
                onChange={(e) => handleFieldChange('greeting', e.target.value)}
                placeholder="The introductory message or roleplay action that initiates conversation..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 font-sans leading-relaxed"
              />
            </div>

            {/* Suggested Prompts */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Suggested Prompts / Test Inquiries (one per line)
              </label>
              <textarea
                rows={3}
                value={(activeCharacter.suggestedPrompts || []).join('\n')}
                onChange={(e) =>
                  handleFieldChange(
                    'suggestedPrompts',
                    e.target.value.split('\n').filter((s) => s.trim().length > 0)
                  )
                }
                placeholder="What occurred during the incident?&#10;Who holds the key to the spires?&#10;What are the archive rules?"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Gemini Directives Enhancer Modal */}
      {showEnhanceDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-zinc-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Wand2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Brainstorm Directives with Gemini</h3>
                <p className="text-xs text-zinc-400">Describe a concept or theme, and Gemini will generate full directives</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Concept or Persona Idea</label>
              <textarea
                rows={4}
                value={enhancePrompt}
                onChange={(e) => setEnhancePrompt(e.target.value)}
                placeholder="e.g. A cynical cyberpunk mechanic who specializes in restoring banned neural implants, grounded in the technical specs doc..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            {enhanceError && (
              <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-red-300 text-xs">
                {enhanceError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEnhanceDialog(false)}
                className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEnhanceWithGemini}
                disabled={isEnhancing || !enhancePrompt.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-2"
              >
                {isEnhancing ? 'Generating Persona...' : 'Generate Directives'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Constellation Spec Editor Modal */}
      <ConstellationEditorModal
        isOpen={isConstellationModalOpen}
        onClose={() => setIsConstellationModalOpen(false)}
        character={activeCharacter}
        onSave={handleSaveConstellationSpec}
      />
    </div>
  );
};
