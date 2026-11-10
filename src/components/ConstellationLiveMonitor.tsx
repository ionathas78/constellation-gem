import React, { useState } from 'react';
import {
  Brain,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Shield,
  Compass,
  Heart,
  Sliders,
  FileText,
  Activity,
  Layers,
} from 'lucide-react';
import { Character, LinkedDoc } from '../types';

interface Props {
  character: Character;
  activeDocs: LinkedDoc[];
  onOpenConstellationEditor: () => void;
}

export const ConstellationLiveMonitor: React.FC<Props> = ({
  character,
  activeDocs,
  onOpenConstellationEditor,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const persona = character.constellationPersona;
  const isConstellation = character.frameworkMode === 'constellation' || Boolean(persona);

  if (!isConstellation) {
    return (
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-zinc-500" />
          <span>Operating in Standard Persona Mode. Grounded with {activeDocs.length} Google Docs.</span>
        </div>
        <button
          onClick={onOpenConstellationEditor}
          className="text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-2 flex items-center gap-1 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Enable Constellation Framework
        </button>
      </div>
    );
  }

  const egoGoal = persona?.personality.ego.currentGoal || 'Engage naturally with the player';
  const dominantShadow = persona?.personality.shadow?.dominantAspect || {
    name: 'Wary Self-Preservation',
    strength: 42,
  };
  const merimnaConcerns = persona?.mentam.merimna.activeConcerns || [
    'Unresolved questions regarding the recent anomalies in the archives.',
  ];
  const trustLevel = persona?.janus.relationshipWithPlayer.trustLevel ?? 50;
  const locus = persona?.corpus.locus || 'Present in the scene';
  const inventory = persona?.corpus.inventory || [];

  return (
    <div className="bg-gradient-to-r from-indigo-950/40 via-zinc-900/80 to-zinc-900 border border-indigo-500/30 rounded-xl overflow-hidden shadow-sm transition-all text-xs">
      {/* Collapsed Bar */}
      <div className="px-4 py-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2.5 text-zinc-200 hover:text-white transition-colors cursor-pointer text-left min-w-0 flex-1"
        >
          <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Brain className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Constellation Engine Active
            </span>
            <span className="text-zinc-500 hidden sm:inline">•</span>
            <span className="text-zinc-400 truncate max-w-xs sm:max-w-md">
              Ego Goal: <em className="text-zinc-300 not-italic">"{egoGoal}"</em>
            </span>
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenConstellationEditor}
            className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Sliders className="w-3 h-3" />
            Edit Spec
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-zinc-400 hover:text-zinc-200 rounded cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Live Telemetry Drawer */}
      {isExpanded && (
        <div className="px-4 pb-3 pt-2 border-t border-zinc-800/80 grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in duration-150">
          {/* Column 1: Personality & Merimna */}
          <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-850 space-y-1.5">
            <div className="flex items-center gap-1.5 text-indigo-300 font-semibold text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Merimna Concern Engine</span>
            </div>
            <p className="text-[11px] text-zinc-400 line-clamp-2">
              • {merimnaConcerns[0] || 'Turning over ambient observations'}
            </p>
            <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Shadow: {dominantShadow.name}</span>
              <span className="font-mono text-indigo-400">{dominantShadow.strength}%</span>
            </div>
          </div>

          {/* Column 2: Corpus Locus & Presence */}
          <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-850 space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-300 font-semibold text-[11px]">
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              <span>Corpus Physical Locus</span>
            </div>
            <p className="text-[11px] text-zinc-400 line-clamp-2">{locus}</p>
            {inventory.length > 0 && (
              <div className="pt-1 text-[11px] text-zinc-500 truncate">
                Items: {inventory.slice(0, 3).join(', ')}
              </div>
            )}
          </div>

          {/* Column 3: Janus Relationship & Source Docs */}
          <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-850 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1 text-blue-300 font-semibold">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                Janus Player Trust:
              </span>
              <span className="font-mono text-blue-300">{trustLevel}%</span>
            </div>
            <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all"
                style={{ width: `${trustLevel}%` }}
              />
            </div>
            <div className="pt-1 flex items-center gap-1 text-[11px] text-zinc-400">
              <FileText className="w-3 h-3 text-amber-400" />
              <span>Source Authority: {activeDocs.length} Google Docs linked</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
