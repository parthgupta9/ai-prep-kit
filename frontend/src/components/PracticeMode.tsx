import React, { useState } from 'react';
import type { Flashcard, PracticeProgress } from '../types/kit';
import { RotateCw, Brain, ThumbsUp, HelpCircle, ArrowRight, ArrowLeft } from 'lucide-react';

interface PracticeModeProps {
  flashcards: Flashcard[];
  practiceState: PracticeProgress;
  onUpdateConfidence: (cardId: string, confidence: number) => void;
}

export const PracticeMode: React.FC<PracticeModeProps> = ({
  flashcards,
  practiceState,
  onUpdateConfidence
}) => {
  const [flipped, setFlipped] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
        <HelpCircle className="w-10 h-10 text-slate-500 mx-auto mb-3" />
        <h4 className="text-lg font-bold text-slate-300">No Flashcards Available</h4>
        <p className="text-sm text-slate-500 mt-1">Add flashcards in the Builder tab to practice.</p>
      </div>
    );
  }

  const sortedCards = [...flashcards].sort((a, b) => {
    const confA = practiceState[a.id]?.confidence ?? 0;
    const confB = practiceState[b.id]?.confidence ?? 0;
    return confA - confB;
  });

  const currentCard = sortedCards[currentIndex] || sortedCards[0];
  const cardProgress = practiceState[currentCard.id];

  const ratedCount = Object.keys(practiceState).length;
  const progressPercent = Math.round((ratedCount / flashcards.length) * 100);

  const handleRating = (score: number) => {
    onUpdateConfidence(currentCard.id, score);
    setFlipped(false);
    if (currentIndex < sortedCards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-sm font-bold text-white">
            <Brain className="w-5 h-5 text-blue-400" />
            <span>Flashcard Mastery Progress</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Ordered dynamically by lowest confidence (Spaced Repetition Queue)
          </p>
        </div>

        <div className="flex items-center space-x-4 w-full sm:w-auto justify-between">
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-400">Covered</span>
            <p className="text-sm font-bold text-blue-400">{ratedCount} / {flashcards.length}</p>
          </div>
          <div className="w-24 bg-slate-950 rounded-full h-3 border border-slate-800 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div
        onClick={() => setFlipped(!flipped)}
        className="cursor-pointer min-h-[300px] bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-8 shadow-2xl flex flex-col justify-between transition-all duration-300 relative group overflow-hidden"
      >
        <div className="flex justify-between items-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <span>Card {currentIndex + 1} of {sortedCards.length}</span>
          <span className="flex items-center space-x-1 text-slate-400">
            <RotateCw className="w-3.5 h-3.5" />
            <span>Click card to flip</span>
          </span>
        </div>

        <div className="my-8 text-center px-4">
          {!flipped ? (
            <div>
              <span className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-bold mb-4">
                QUESTION / CONCEPT
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-white leading-relaxed">
                {currentCard.front}
              </h3>
            </div>
          ) : (
            <div className="animate-fade-in">
              <span className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold mb-4">
                ANSWER / BEST PRACTICE
              </span>
              <p className="text-base sm:text-lg text-slate-200 leading-relaxed font-medium">
                {currentCard.back}
              </p>
            </div>
          )}
        </div>

        {cardProgress && (
          <div className="text-center text-xs font-medium text-slate-400">
            Current Confidence:{' '}
            <span className={`font-bold ${
              cardProgress.confidence === 3 ? 'text-green-400' : cardProgress.confidence === 2 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {cardProgress.confidence === 3 ? 'Easy' : cardProgress.confidence === 2 ? 'Medium' : 'Hard'}
            </span>
          </div>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3">
        <button
          onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : sortedCards.length - 1))}
          className="p-3 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 grid grid-cols-3 gap-2 sm:gap-3">
          <button
            onClick={() => handleRating(1)}
            className="py-3 px-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center space-x-1.5"
          >
            <span>Needs Review (Hard)</span>
          </button>
          <button
            onClick={() => handleRating(2)}
            className="py-3 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center space-x-1.5"
          >
            <span>Getting There (Med)</span>
          </button>
          <button
            onClick={() => handleRating(3)}
            className="py-3 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center space-x-1.5"
          >
            <ThumbsUp className="w-4 h-4 shrink-0" />
            <span>Mastered (Easy)</span>
          </button>
        </div>

        <button
          onClick={() => setCurrentIndex((prev) => (prev < sortedCards.length - 1 ? prev + 1 : 0))}
          className="p-3 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
