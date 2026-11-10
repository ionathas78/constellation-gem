import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Sliders,
  Code2,
  Copy,
  Check,
  Brain,
  Shield,
  Compass,
  Heart,
  Feather,
  FileCode,
  AlertCircle,
  Eye,
  Plus,
  Trash2,
} from 'lucide-react';
import { ConstellationPersona } from '../types/constellation';
import { Character } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  character: Character;
  onSave: (updatedPersona: ConstellationPersona) => void;
}

export const ConstellationEditorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  character,
  onSave,
}) => {
  // Initialize from character's constellationPersona or synthesize sensible defaults
  const initialPersona: ConstellationPersona = character.constellationPersona || {
    id: character.id,
    name: character.name,
    tagline: character.role,
    contextIngestionMandates: [
      'Scan all context for setting but do not ingest any knowledge to which you would not be privy.',
      'Always maintain strict separation between player knowledge and character knowledge.',
      'Use player knowledge to inform the character options, never to inform the character choices.',
      'Always use character knowledge to determine how the character feels, speaks, and acts.',
    ],
    personality: {
      archetype: 'The Scholar',
      shadowArchetype: 'The Hidden Rebel',
      ego: {
        description: character.directives || 'Direct goal-oriented persona actor',
        currentGoal: 'Assess the player while remaining faithful to lore',
      },
      shadow: {
        dominantAspect: {
          name: 'Vigilant Self-Preservation',
          description: 'Subconscious impulse to withhold vital coordinates or facts until trust is established.',
          strength: 40,
        },
        aspects: [
          { name: 'Gambler Instinct', description: 'Urge to take daring shortcuts.' },
        ],
      },
      emotionMon: {
        state: 'Calm Vigilance',
        tensionLevel: 25,
      },
      emotionalMerits: ['Resilient focus'],
      emotionalFlaws: ['Guarded demeanor'],
    },
    spiritu: {
      core: 'Deep commitment to verifiable truth and sacred lore.',
      virtues: [
        { name: 'Faithfulness', strength: 80, description: 'Steadfast loyalty to sworn oaths' },
        { name: 'Self-control', strength: 75, description: 'Maintains composure under pressure' },
      ],
      vices: [
        { name: 'Pride', strength: 40, description: 'Hesitant to admit uncertainty' },
      ],
    },
    mentam: {
      merimna: {
        activeConcerns: [
          'Unresolved mysteries documented in the external Google Docs archive.',
          'Balancing personal discretion against the demands of the user.',
        ],
        processingSpiders: ['Lore consistency analysis'],
      },
      skills: ['Historical analysis', 'Acoustics', 'Cartography'],
    },
    corpus: {
      appearance: 'Dignified and observant, bearing the marks of a disciplined life.',
      wardrobe: 'Functional garments suited to long hours of study or travel.',
      inventory: ['Field journal', 'Brass stylus', 'Reference token'],
      locus: 'Within a quiet, candlelit chamber seated before an expansive study table',
    },
    janus: {
      relationshipWithPlayer: {
        trustLevel: 45,
        socialDynamic: 'Cautious, inquisitive professional appraisal',
      },
    },
    voice: {
      tone: character.tone || 'Deliberate, articulate, and observant.',
      accent: 'Measured and crisp.',
      vocabulary: 'Precise and fitting the era and lore.',
      microexpressions: ['Subtle narrowing of eyes when evaluating honesty'],
      behaviors: ['Pauses before replying to weighty queries'],
      kinetics: ['Maintains grounded, poised posture'],
    },
  };

  const [persona, setPersona] = useState<ConstellationPersona>(initialPersona);
  const [activeTab, setActiveTab] = useState<'visual' | 'json'>('visual');
  const [activeSection, setActiveSection] = useState<'personality' | 'mentam' | 'spiritu' | 'corpus' | 'janus' | 'voice'>('personality');
  const [jsonString, setJsonString] = useState<string>(JSON.stringify(initialPersona, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyJson = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(JSON.stringify(persona, null, 2)).catch((err) => {
        console.warn('Clipboard write failed:', err);
      });
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJsonChange = (val: string) => {
    setJsonString(val);
    try {
      const parsed = JSON.parse(val);
      setPersona(parsed);
      setJsonError(null);
    } catch (e: any) {
      setJsonError(e.message);
    }
  };

  const handleSave = () => {
    onSave(persona);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-zinc-100">Constellation Persona Framework</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950/80 text-indigo-300 border border-indigo-800/40">
                  spec v0.1.0
                </span>
              </div>
              <p className="text-xs text-zinc-400">Multi-agent cognitive architecture for {character.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-zinc-800/80 p-0.5 rounded-lg border border-zinc-700/60 text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('visual');
                  setJsonString(JSON.stringify(persona, null, 2));
                }}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === 'visual' ? 'bg-indigo-600 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Visual Studio
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('json');
                  setJsonString(JSON.stringify(persona, null, 2));
                }}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === 'json' ? 'bg-indigo-600 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Raw Spec JSON
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        {activeTab === 'visual' ? (
          <div className="flex-1 flex overflow-hidden min-h-[460px]">
            {/* Sidebar navigation for Constellation departments */}
            <div className="w-52 border-r border-zinc-800 bg-zinc-950/50 p-3 space-y-1 overflow-y-auto">
              <button
                type="button"
                onClick={() => setActiveSection('personality')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                  activeSection === 'personality'
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                }`}
              >
                <Brain className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Personality & Ego</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('mentam')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                  activeSection === 'mentam'
                    ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Mentam & Merimna</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('spiritu')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                  activeSection === 'spiritu'
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                }`}
              >
                <Heart className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Spiritu (Virtues/Vices)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('corpus')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                  activeSection === 'corpus'
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                }`}
              >
                <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Corpus & Locus</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('janus')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                  activeSection === 'janus'
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                }`}
              >
                <Shield className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Janus (Player Trust)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('voice')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                  activeSection === 'voice'
                    ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                }`}
              >
                <Feather className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Voice & Kinetics</span>
              </button>
            </div>

            {/* Department Form Panel */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {activeSection === 'personality' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200">Personality & Ego (Primary Actor)</h3>
                    <p className="text-xs text-zinc-400">
                      The Ego speaks to achieve immediate, tangible goals (persuasion, testing, concealment).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Archetype</label>
                      <input
                        type="text"
                        value={persona.personality.archetype}
                        onChange={(e) =>
                          setPersona({
                            ...persona,
                            personality: { ...persona.personality, archetype: e.target.value },
                          })
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Shadow Archetype</label>
                      <input
                        type="text"
                        value={persona.personality.shadowArchetype}
                        onChange={(e) =>
                          setPersona({
                            ...persona,
                            personality: { ...persona.personality, shadowArchetype: e.target.value },
                          })
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Immediate Conscious Goal (Ego Mandate)</label>
                    <input
                      type="text"
                      value={persona.personality.ego.currentGoal || ''}
                      onChange={(e) =>
                        setPersona({
                          ...persona,
                          personality: {
                            ...persona.personality,
                            ego: { ...persona.personality.ego, currentGoal: e.target.value },
                          },
                        })
                      }
                      placeholder="e.g. Assess whether the player can be trusted before showing the ancient star-map"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-zinc-300">Dominant Shadow Aspect (Subconscious Pull)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">Aspect Name</label>
                        <input
                          type="text"
                          value={persona.personality.shadow?.dominantAspect?.name || ''}
                          onChange={(e) =>
                            setPersona({
                              ...persona,
                              personality: {
                                ...persona.personality,
                                shadow: {
                                  ...persona.personality.shadow,
                                  dominantAspect: {
                                    name: e.target.value,
                                    description: persona.personality.shadow?.dominantAspect?.description || '',
                                    strength: persona.personality.shadow?.dominantAspect?.strength || 40,
                                  },
                                },
                              },
                            })
                          }
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                          <span>Strength</span>
                          <span>{persona.personality.shadow?.dominantAspect?.strength || 40}/100</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={persona.personality.shadow?.dominantAspect?.strength || 40}
                          onChange={(e) =>
                            setPersona({
                              ...persona,
                              personality: {
                                ...persona.personality,
                                shadow: {
                                  ...persona.personality.shadow,
                                  dominantAspect: {
                                    name: persona.personality.shadow?.dominantAspect?.name || '',
                                    description: persona.personality.shadow?.dominantAspect?.description || '',
                                    strength: parseInt(e.target.value, 10),
                                  },
                                },
                              },
                            })
                          }
                          className="w-full accent-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'mentam' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200">Mentam: Merimna & Knowledge</h3>
                    <p className="text-xs text-zinc-400">
                      Merimna continuously turns over unresolved concerns and dilemmas in the background, surfacing insights.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-zinc-400">Merimna Active Concerns (Unresolved Problems)</label>
                    {(persona.mentam.merimna.activeConcerns || []).map((concern, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={concern}
                          onChange={(e) => {
                            const updated = [...persona.mentam.merimna.activeConcerns];
                            updated[idx] = e.target.value;
                            setPersona({
                              ...persona,
                              mentam: {
                                ...persona.mentam,
                                merimna: { ...persona.mentam.merimna, activeConcerns: updated },
                              },
                            });
                          }}
                          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = persona.mentam.merimna.activeConcerns.filter((_, i) => i !== idx);
                            setPersona({
                              ...persona,
                              mentam: {
                                ...persona.mentam,
                                merimna: { ...persona.mentam.merimna, activeConcerns: updated },
                              },
                            });
                          }}
                          className="p-1.5 text-zinc-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setPersona({
                          ...persona,
                          mentam: {
                            ...persona.mentam,
                            merimna: {
                              ...persona.mentam.merimna,
                              activeConcerns: [
                                ...(persona.mentam.merimna.activeConcerns || []),
                                'New pressing dilemma regarding current mission',
                              ],
                            },
                          },
                        });
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Concern
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Established Skills (comma-separated)</label>
                    <input
                      type="text"
                      value={(persona.mentam.skills || []).join(', ')}
                      onChange={(e) =>
                        setPersona({
                          ...persona,
                          mentam: {
                            ...persona.mentam,
                            skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                          },
                        })
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200"
                    />
                  </div>
                </div>
              )}

              {activeSection === 'spiritu' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200">Spiritu: Virtues & Vices</h3>
                    <p className="text-xs text-zinc-400">
                      Guides moral dilemmas, crisis of conscience, and internal virtue friction.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Spiritual Core Credo</label>
                    <textarea
                      rows={2}
                      value={persona.spiritu.core || ''}
                      onChange={(e) =>
                        setPersona({
                          ...persona,
                          spiritu: { ...persona.spiritu, core: e.target.value },
                        })
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800 space-y-3">
                      <h4 className="text-xs font-semibold text-purple-300">Virtues (Moral Strengths)</h4>
                      {(persona.spiritu.virtues || []).map((v, i) => (
                        <div key={i} className="text-xs">
                          <div className="flex justify-between text-zinc-300 mb-1">
                            <span>{v.name}</span>
                            <span className="font-mono text-zinc-500">{v.strength}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={v.strength}
                            onChange={(e) => {
                              const updated = [...(persona.spiritu.virtues || [])];
                              updated[i] = { ...v, strength: parseInt(e.target.value, 10) };
                              setPersona({
                                ...persona,
                                spiritu: { ...persona.spiritu, virtues: updated },
                              });
                            }}
                            className="w-full accent-purple-500"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800 space-y-3">
                      <h4 className="text-xs font-semibold text-rose-300">Vices (Moral Predilections)</h4>
                      {(persona.spiritu.vices || []).map((v, i) => (
                        <div key={i} className="text-xs">
                          <div className="flex justify-between text-zinc-300 mb-1">
                            <span>{v.name}</span>
                            <span className="font-mono text-zinc-500">{v.strength}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={v.strength}
                            onChange={(e) => {
                              const updated = [...(persona.spiritu.vices || [])];
                              updated[i] = { ...v, strength: parseInt(e.target.value, 10) };
                              setPersona({
                                ...persona,
                                spiritu: { ...persona.spiritu, vices: updated },
                              });
                            }}
                            className="w-full accent-rose-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'corpus' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200">Corpus: Physical Locus & Wardrobe</h3>
                    <p className="text-xs text-zinc-400">
                      Locus defines exact physical positioning in scene, proxemics, and item interactions.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Locus (Current Position & Environment)</label>
                    <input
                      type="text"
                      value={persona.corpus.locus}
                      onChange={(e) =>
                        setPersona({
                          ...persona,
                          corpus: { ...persona.corpus, locus: e.target.value },
                        })
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Wardrobe & Attire</label>
                    <input
                      type="text"
                      value={persona.corpus.wardrobe}
                      onChange={(e) =>
                        setPersona({
                          ...persona,
                          corpus: { ...persona.corpus, wardrobe: e.target.value },
                        })
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Inventory on Person (comma-separated)</label>
                    <input
                      type="text"
                      value={(persona.corpus.inventory || []).join(', ')}
                      onChange={(e) =>
                        setPersona({
                          ...persona,
                          corpus: {
                            ...persona.corpus,
                            inventory: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                          },
                        })
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              {activeSection === 'janus' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200">Janus: Relationship with Player</h3>
                    <p className="text-xs text-zinc-400">
                      Janus governs social caution and meaningful, slow-burning trust progression.
                    </p>
                  </div>

                  <div className="bg-zinc-950/70 p-4 rounded-xl border border-zinc-800 space-y-4">
                    <div>
                      <div className="flex justify-between text-xs text-zinc-300 mb-1">
                        <span>Trust Level with Player</span>
                        <span className="font-mono text-blue-400">{persona.janus.relationshipWithPlayer.trustLevel}/100</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={persona.janus.relationshipWithPlayer.trustLevel}
                        onChange={(e) =>
                          setPersona({
                            ...persona,
                            janus: {
                              ...persona.janus,
                              relationshipWithPlayer: {
                                ...persona.janus.relationshipWithPlayer,
                                trustLevel: parseInt(e.target.value, 10),
                              },
                            },
                          })
                        }
                        className="w-full accent-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Social Dynamic</label>
                      <input
                        type="text"
                        value={persona.janus.relationshipWithPlayer.socialDynamic}
                        onChange={(e) =>
                          setPersona({
                            ...persona,
                            janus: {
                              ...persona.janus,
                              relationshipWithPlayer: {
                                ...persona.janus.relationshipWithPlayer,
                                socialDynamic: e.target.value,
                              },
                            },
                          })
                        }
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'voice' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200">Voice, Microexpressions & Kinetics</h3>
                    <p className="text-xs text-zinc-400">
                      Guides acoustic timbre, vocabulary, behavioral gestures, and physical microexpressions.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Tone</label>
                      <input
                        type="text"
                        value={persona.voice.tone}
                        onChange={(e) =>
                          setPersona({
                            ...persona,
                            voice: { ...persona.voice, tone: e.target.value },
                          })
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Accent / Cadence</label>
                      <input
                        type="text"
                        value={persona.voice.accent}
                        onChange={(e) =>
                          setPersona({
                            ...persona,
                            voice: { ...persona.voice, accent: e.target.value },
                          })
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Microexpressions (semicolon-separated)</label>
                    <input
                      type="text"
                      value={(persona.voice.microexpressions || []).join('; ')}
                      onChange={(e) =>
                        setPersona({
                          ...persona,
                          voice: {
                            ...persona.voice,
                            microexpressions: e.target.value.split(';').map((s) => s.trim()).filter(Boolean),
                          },
                        })
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-4 bg-zinc-950 font-mono text-xs">
            <div className="flex justify-between items-center mb-2 px-2 text-zinc-400">
              <span className="flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-indigo-400" />
                Raw Constellation Persona JSON (Edit directly or paste your schema)
              </span>
              <button
                type="button"
                onClick={handleCopyJson}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy Spec'}
              </button>
            </div>
            {jsonError && (
              <div className="mb-2 p-2 rounded bg-red-950 border border-red-800 text-red-300 text-[11px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>JSON Syntax Error: {jsonError}</span>
              </div>
            )}
            <textarea
              value={jsonString}
              onChange={(e) => handleJsonChange(e.target.value)}
              className="flex-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-zinc-200 leading-relaxed font-mono focus:outline-none focus:border-indigo-500/80 resize-none"
            />
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950 flex justify-between items-center text-xs">
          <div className="flex items-center gap-2 text-zinc-400">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Constellation Architecture is mapped directly to Gemini system instructions</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors shadow-sm cursor-pointer"
            >
              Save Constellation Spec
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
