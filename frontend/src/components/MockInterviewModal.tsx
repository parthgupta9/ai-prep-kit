import React, { useState } from 'react';
import type { Question, MockInterviewFeedback } from '../types/kit';
import { runMockInterview } from '../services/api';
import { X, Sparkles, Send, CheckCircle2, AlertCircle, Award, Loader2, BookOpen } from 'lucide-react';

interface MockInterviewModalProps {
  kitId: string;
  question: Question | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MockInterviewModal: React.FC<MockInterviewModalProps> = ({
  kitId,
  question,
  isOpen,
  onClose
}) => {
  const [userAnswer, setUserAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<MockInterviewFeedback | null>(null);
  const [error, setError] = useState('');

  if (!isOpen || !question) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer || userAnswer.trim().length < 5) {
      setError('Please type your response (at least 5 characters).');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await runMockInterview(kitId, question.id, userAnswer);
      setFeedback(data.feedback);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze answer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">AI Mock Interview Simulator</h3>
            <p className="text-xs text-slate-400">Practice your answer & get instant AI evaluation</p>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-6">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-1">
            Question ({question.category})
          </span>
          <p className="text-sm font-semibold text-slate-200">{question.prompt}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!feedback ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Your Answer / Explanation
              </label>
              <textarea
                rows={6}
                required
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your response as if answering in a real interview (include context, technical decisions, and results)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-purple-600/20 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Evaluating Answer...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Answer for AI Evaluation</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Evaluation Score</span>
                <span className="text-2xl font-extrabold text-white">{feedback.rating} ({feedback.score}/10)</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                <Award className="w-6 h-6 text-purple-400" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5 mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Key Strengths</span>
                </h4>
                <ul className="space-y-1 text-xs text-emerald-200 list-disc list-inside">
                  {feedback.key_strengths.map((str, idx) => (
                    <li key={idx}>{str}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>Areas to Expand</span>
                </h4>
                <ul className="space-y-1 text-xs text-amber-200 list-disc list-inside">
                  {feedback.missing_points.map((pt, idx) => (
                    <li key={idx}>{pt}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center space-x-1.5 mb-2">
                <BookOpen className="w-4 h-4" />
                <span>Model STAR Answer</span>
              </h4>
              <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {feedback.star_sample_answer}
              </p>
            </div>

            <button
              onClick={() => { setFeedback(null); setUserAnswer(''); }}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition"
            >
              Try Another Answer
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
