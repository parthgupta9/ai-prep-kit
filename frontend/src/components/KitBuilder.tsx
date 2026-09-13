import React, { useState } from 'react';
import type { Kit, Question, Flashcard, PracticeProgress } from '../types/kit';
import { regenerateKitSection, updateKit } from '../services/api';
import { PracticeMode } from './PracticeMode';
import { MockInterviewModal } from './MockInterviewModal';
import {
  Building2,
  Briefcase,
  HelpCircle,
  Brain,
  Calendar,
  Sparkles,
  Trash2,
  Plus,
  RefreshCw,
  Pin,
  Save,
  CheckCircle,
  Play,
  Clock,
  MoveUp,
  MoveDown
} from 'lucide-react';

interface KitBuilderProps {
  kit: Kit;
  kitId: string;
  onSave: (updatedKit: Kit) => void;
}

export const KitBuilder: React.FC<KitBuilderProps> = ({ kit, kitId, onSave }) => {
  const [activeTab, setActiveTab] = useState<'brief' | 'role' | 'questions' | 'flashcards' | 'schedule' | 'practice'>('brief');
  const [currentKit, setCurrentKit] = useState<Kit>(kit);
  const [practiceState, setPracticeState] = useState<PracticeProgress>({});
  
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);

  const [mockQuestion, setMockQuestion] = useState<Question | null>(null);

  React.useEffect(() => {
    setCurrentKit(kit);
  }, [kit]);

  const handleSaveKit = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      await updateKit(kitId, currentKit, practiceState);
      onSave(currentKit);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async (section: string, categoryName?: string) => {
    setRegeneratingSection(categoryName || section);
    try {
      const res = await regenerateKitSection(kitId, section, categoryName);
      setCurrentKit(res.kit);
      onSave(res.kit);
    } catch (err: any) {
      alert(`Regeneration failed: ${err.message}`);
    } finally {
      setRegeneratingSection(null);
    }
  };

  const updateQuestionField = (qId: string, field: keyof Question, value: any) => {
    const updated = { ...currentKit };
    updated.questions = updated.questions.map(q => {
      if (q.id === qId) {
        return { ...q, [field]: value, isEdited: true };
      }
      return q;
    });
    setCurrentKit(updated);
  };

  const togglePinQuestion = (qId: string) => {
    const updated = { ...currentKit };
    updated.questions = updated.questions.map(q => {
      if (q.id === qId) {
        return { ...q, isPinned: !q.isPinned };
      }
      return q;
    });
    setCurrentKit(updated);
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= currentKit.questions.length) return;

    const updated = { ...currentKit };
    const qList = [...updated.questions];
    const temp = qList[index];
    qList[index] = qList[targetIdx];
    qList[targetIdx] = temp;
    updated.questions = qList;
    setCurrentKit(updated);
  };

  const deleteQuestion = (qId: string) => {
    const updated = { ...currentKit };
    updated.questions = updated.questions.filter(q => q.id !== qId);
    setCurrentKit(updated);
  };

  const addQuestion = (category: 'technical' | 'behavioural' | 'system-design' | 'company-fit') => {
    const updated = { ...currentKit };
    const newId = `q_custom_${Date.now()}`;
    const newQ: Question = {
      id: newId,
      requirement_ids: [updated.role.requirements[0]?.id || 'r1'],
      category,
      prompt: 'Type your custom interview question prompt...',
      answer_outline: 'Type the expected answer outline and key points...',
      difficulty: 2,
      isEdited: true,
      isPinned: true
    };
    updated.questions.push(newQ);
    setCurrentKit(updated);
  };

  const addFlashcard = () => {
    const updated = { ...currentKit };
    const newF: Flashcard = {
      id: `f_custom_${Date.now()}`,
      front: 'New Concept / Question',
      back: 'Explanation or Answer Outline',
      requirement_ids: [updated.role.requirements[0]?.id || 'r1'],
      isEdited: true
    };
    updated.flashcards.push(newF);
    setCurrentKit(updated);
  };

  const deleteFlashcard = (fId: string) => {
    const updated = { ...currentKit };
    updated.flashcards = updated.flashcards.filter(f => f.id !== fId);
    setCurrentKit(updated);
  };

  const updateFlashcardField = (fId: string, field: 'front' | 'back', value: string) => {
    const updated = { ...currentKit };
    updated.flashcards = updated.flashcards.map(f => {
      if (f.id === fId) {
        return { ...f, [field]: value, isEdited: true };
      }
      return f;
    });
    setCurrentKit(updated);
  };

  const categories: ('technical' | 'behavioural' | 'system-design' | 'company-fit')[] = [
    'technical',
    'behavioural',
    'system-design',
    'company-fit'
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      
      {/* Top Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <h2 className="text-2xl font-extrabold text-white">{currentKit.role.title}</h2>
            <span className="px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-bold uppercase">
              {currentKit.source.company || 'Target Company'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Researched at: {new Date(currentKit.source.researched_at).toLocaleString()} • {currentKit.schedule.days_available} Days Preparation Schedule
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1 animate-fade-in">
              <CheckCircle className="w-4 h-4" />
              <span>Saved!</span>
            </span>
          )}

          <button
            onClick={handleSaveKit}
            disabled={saving}
            className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Kit Changes'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex space-x-2 border-b border-slate-800 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('brief')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition shrink-0 ${
            activeTab === 'brief'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Company Brief</span>
        </button>

        <button
          onClick={() => setActiveTab('role')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition shrink-0 ${
            activeTab === 'role'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Role Breakdown & Requirements</span>
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition shrink-0 ${
            activeTab === 'questions'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Question Bank ({currentKit.questions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('flashcards')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition shrink-0 ${
            activeTab === 'flashcards'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
          }`}
        >
          <Brain className="w-4 h-4" />
          <span>Flashcards ({currentKit.flashcards.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition shrink-0 ${
            activeTab === 'schedule'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Study Schedule ({currentKit.schedule.days_available} Days)</span>
        </button>

        <button
          onClick={() => setActiveTab('practice')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition shrink-0 ${
            activeTab === 'practice'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
          }`}
        >
          <Play className="w-4 h-4" />
          <span>Practice Mode</span>
        </button>
      </div>

      {/* TAB 1: COMPANY BRIEF */}
      {activeTab === 'brief' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              <span>Company Intelligence & Brief</span>
            </h3>

            <button
              onClick={() => handleRegenerate('company_brief')}
              disabled={regeneratingSection === 'company_brief'}
              className="flex items-center space-x-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regeneratingSection === 'company_brief' ? 'animate-spin' : ''}`} />
              <span>Regenerate Brief</span>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Company Overview / Summary
              </label>
              <textarea
                rows={3}
                value={currentKit.company_brief.summary}
                onChange={(e) => {
                  const updated = { ...currentKit };
                  updated.company_brief.summary = e.target.value;
                  setCurrentKit(updated);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                What They Do & Engineering Focus
              </label>
              <textarea
                rows={3}
                value={currentKit.company_brief.what_they_do}
                onChange={(e) => {
                  const updated = { ...currentKit };
                  updated.company_brief.what_they_do = e.target.value;
                  setCurrentKit(updated);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200"
              />
            </div>

            {currentKit.company_brief.sources && currentKit.company_brief.sources.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Crawled Sources Used
                </label>
                <div className="flex flex-wrap gap-2">
                  {currentKit.company_brief.sources.map((src, idx) => (
                    <a
                      key={idx}
                      href={src}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-400 underline bg-slate-950 px-2.5 py-1 rounded border border-slate-800"
                    >
                      {src}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ROLE BREAKDOWN & REQUIREMENTS */}
      {activeTab === 'role' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Briefcase className="w-5 h-5 text-indigo-400" />
            <span>Role Metadata & Extracted Requirements</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Job Title</span>
              <p className="text-base font-semibold text-white mt-1">{currentKit.role.title}</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Seniority</span>
              <p className="text-base font-semibold text-white mt-1">{currentKit.role.seniority}</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-300 mb-3">Extracted Role Requirements</h4>
            <div className="space-y-2">
              {currentKit.role.requirements.map((req) => (
                <div
                  key={req.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-xs text-slate-500 font-bold px-2 py-0.5 bg-slate-900 rounded">
                      {req.id}
                    </span>
                    <span className="text-sm text-slate-200 font-medium">{req.text}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                      req.kind === 'technical' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
                    }`}>
                      {req.kind}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                      req.priority === 'must' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {req.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: QUESTION BANK */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          {categories.map((cat) => {
            const catQuestions = currentKit.questions.filter((q) => q.category === cat);
            return (
              <div key={cat} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-base font-bold text-white uppercase tracking-wider">
                      {cat.replace('-', ' ')} Questions ({catQuestions.length})
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleRegenerate('category', cat)}
                      disabled={regeneratingSection === cat}
                      className="flex items-center space-x-1.5 text-xs font-semibold text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${regeneratingSection === cat ? 'animate-spin' : ''}`} />
                      <span>Regenerate Category</span>
                    </button>

                    <button
                      onClick={() => addQuestion(cat)}
                      className="flex items-center space-x-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Question</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {catQuestions.map((q) => {
                    const globalIndex = currentKit.questions.findIndex(item => item.id === q.id);
                    return (
                      <div
                        key={q.id}
                        className={`bg-slate-950 border rounded-2xl p-4 space-y-3 transition ${
                          q.isPinned ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-blue-400 px-2 py-0.5 bg-blue-500/10 rounded">
                              {q.id}
                            </span>
                            <span className="text-xs text-slate-500 font-semibold">
                              Difficulty: {q.difficulty}/3
                            </span>

                            {q.isPinned && (
                              <span className="text-xs font-bold text-amber-400 flex items-center space-x-1 px-2 py-0.5 bg-amber-500/10 rounded">
                                <Pin className="w-3 h-3" />
                                <span>Pinned (Preserved)</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => setMockQuestion(q)}
                              className="px-2.5 py-1 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 text-xs font-bold rounded-lg border border-purple-500/30 flex items-center space-x-1"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>AI Practice</span>
                            </button>

                            <button
                              onClick={() => moveQuestion(globalIndex, 'up')}
                              disabled={globalIndex === 0}
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                            >
                              <MoveUp className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => moveQuestion(globalIndex, 'down')}
                              disabled={globalIndex === currentKit.questions.length - 1}
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                            >
                              <MoveDown className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => togglePinQuestion(q.id)}
                              className={`p-1.5 rounded ${q.isPinned ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                              <Pin className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => deleteQuestion(q.id)}
                              className="p-1.5 text-slate-500 hover:text-red-400 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Question Prompt</label>
                          <input
                            type="text"
                            value={q.prompt}
                            onChange={(e) => updateQuestionField(q.id, 'prompt', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Answer Outline</label>
                          <textarea
                            rows={2}
                            value={q.answer_outline}
                            onChange={(e) => updateQuestionField(q.id, 'answer_outline', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-300"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 4: FLASHCARDS */}
      {activeTab === 'flashcards' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Brain className="w-5 h-5 text-blue-400" />
              <span>Flashcard Deck</span>
            </h3>

            <button
              onClick={addFlashcard}
              className="flex items-center space-x-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Flashcard</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentKit.flashcards.map((f) => (
              <div key={f.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400">{f.id}</span>
                  <button
                    onClick={() => deleteFlashcard(f.id)}
                    className="text-slate-500 hover:text-red-400 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Front (Question)</label>
                  <input
                    type="text"
                    value={f.front}
                    onChange={(e) => updateFlashcardField(f.id, 'front', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Back (Answer)</label>
                  <textarea
                    rows={2}
                    value={f.back}
                    onChange={(e) => updateFlashcardField(f.id, 'back', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: STUDY SCHEDULE */}
      {activeTab === 'schedule' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                <span>Deterministic Preparation Schedule</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Allocated material across exactly {currentKit.schedule.days_available} days with integer duration minutes.
              </p>
            </div>

            <button
              onClick={() => handleRegenerate('schedule')}
              disabled={regeneratingSection === 'schedule'}
              className="flex items-center space-x-1.5 text-xs font-semibold text-purple-400 bg-purple-500/10 px-3 py-1.5 rounded-lg border border-purple-500/20 hover:bg-purple-500/20 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regeneratingSection === 'schedule' ? 'animate-spin' : ''}`} />
              <span>Re-allocate Schedule</span>
            </button>
          </div>

          <div className="space-y-4">
            {currentKit.schedule.days.map((dayItem) => {
              const dayQuestions = currentKit.questions.filter((q) => dayItem.question_ids.includes(q.id));
              return (
                <div key={dayItem.day} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center space-x-3">
                      <span className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center font-bold text-purple-400 text-sm">
                        D{dayItem.day}
                      </span>
                      <span className="font-bold text-white text-sm">{dayItem.focus}</span>
                    </div>

                    <div className="flex items-center space-x-1 text-xs text-slate-400 font-semibold bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{dayItem.minutes} Minutes</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pl-11">
                    {dayQuestions.length > 0 ? (
                      dayQuestions.map((q) => (
                        <div key={q.id} className="text-xs text-slate-300 flex items-center space-x-2">
                          <span className="font-bold text-blue-400">[{q.id}]</span>
                          <span className="truncate">{q.prompt}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic">Review & Revision Buffer</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 6: PRACTICE MODE */}
      {activeTab === 'practice' && (
        <PracticeMode
          flashcards={currentKit.flashcards}
          practiceState={practiceState}
          onUpdateConfidence={(cardId, confidence) => {
            setPracticeState((prev) => ({
              ...prev,
              [cardId]: { confidence, lastReviewedAt: new Date().toISOString() }
            }));
          }}
        />
      )}

      {/* AI Mock Interview Modal */}
      <MockInterviewModal
        kitId={kitId}
        question={mockQuestion}
        isOpen={!!mockQuestion}
        onClose={() => setMockQuestion(null)}
      />

    </div>
  );
};
