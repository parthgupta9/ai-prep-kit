import React, { useState } from 'react';
import { createKit } from '../services/api';
import type { Kit } from '../types/kit';
import { Sparkles, Globe, Calendar, FileText, Upload, AlertTriangle, CheckCircle2, Loader2, Info } from 'lucide-react';

interface KitCreateFormProps {
  onKitCreated: (kit: Kit, kitId: string) => void;
  onOpenAuth: () => void;
  isAuthenticated: boolean;
}

export const KitCreateForm: React.FC<KitCreateFormProps> = ({
  onKitCreated,
  onOpenAuth,
  isAuthenticated
}) => {
  const [jd, setJd] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [days, setDays] = useState(5);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchFileContent, setBatchFileContent] = useState('');
  
  const [generating, setGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState('');

  const steps = [
    'Validating Input & Research Targets',
    'Crawling Company Site & Public Discussion',
    'Extracting Role Requirements & Metadata',
    'Generating Categorized Questions & Flashcards',
    'Executing Coverage Verification & 2nd Pass',
    'Allocating Deterministic Preparation Schedule'
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setBatchFileContent(text);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enforce authentication modal for signed-out visitors as specified in PDF section 1
    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }

    setError('');
    setGenerating(true);
    setCurrentStep(0);

    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1200);

    try {
      if (isBatchMode) {
        let batchArray: any[] = [];
        try {
          batchArray = JSON.parse(batchFileContent);
          if (!Array.isArray(batchArray)) throw new Error('Batch JSON must be an array');
        } catch (err: any) {
          throw new Error(`Batch file format error: ${err.message}. Please upload valid JSON array.`);
        }

        const data = await createKit({ jd: '', company_url: '', days: 5, batch: batchArray });
        clearInterval(interval);
        if (data.results && data.results.length > 0 && data.results[0].kit) {
          onKitCreated(data.results[0].kit, data.results[0].kitId);
        } else {
          throw new Error('Failed to process batch creation');
        }
      } else {
        if (!jd || jd.trim().length < 10) {
          throw new Error('Please enter a valid job description (at least 10 characters).');
        }
        const data = await createKit({ jd, company_url: companyUrl, days });
        clearInterval(interval);
        onKitCreated(data.kit, data.kitId);
      }
    } catch (err: any) {
      clearInterval(interval);
      setError(err.message || 'Generation failed. Make sure the backend server (npm run dev:backend) is running.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      
      {/* Hero Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Interview Preparation Architecture</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Transform Any Job Description into a <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Personalized Interview Prep Kit
          </span>
        </h2>
        <p className="mt-3 text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
          Paste the job posting and company URL. Our pipeline crawls their engineering culture, extracts must-have requirements, verifies question coverage, and builds your deterministic day-by-day prep plan.
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex justify-center mb-6">
        <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex space-x-1">
          <button
            type="button"
            onClick={() => setIsBatchMode(false)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              !isBatchMode ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Single Job Description
          </button>
          <button
            type="button"
            onClick={() => setIsBatchMode(true)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              isBatchMode ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Batch Import (File / JSON)
          </button>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center space-x-3 text-red-400 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold">Generation Notice</p>
              <p className="text-xs opacity-90">{error}</p>
            </div>
          </div>
        )}

        {generating ? (
          <div className="py-12 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto mb-6 relative">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">Generating Interview Prep Kit</h3>
            <p className="text-sm text-slate-400 mb-8 max-w-md mx-auto">
              Running multi-stage crawler, requirement extraction, coverage verification loop, and schedule allocation...
            </p>

            <div className="max-w-md mx-auto space-y-3 text-left">
              {steps.map((stepText, idx) => {
                const isDone = idx < currentStep;
                const isCurrent = idx === currentStep;
                return (
                  <div
                    key={idx}
                    className={`flex items-center space-x-3 p-3 rounded-xl border transition ${
                      isCurrent
                        ? 'bg-blue-500/10 border-blue-500/40 text-blue-300 font-semibold'
                        : isDone
                        ? 'bg-slate-950/40 border-slate-800 text-slate-400'
                        : 'opacity-40 border-transparent text-slate-500'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 className="w-5 h-5 text-blue-400 animate-spin shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-slate-700 text-xs flex items-center justify-center font-bold text-slate-500 shrink-0">
                        {idx + 1}
                      </div>
                    )}
                    <span className="text-xs sm:text-sm">{stepText}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isBatchMode ? (
              <>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span>Job Description Text</span>
                    </label>
                    <span className="text-xs text-slate-500">{jd.length} characters</span>
                  </div>
                  <textarea
                    rows={6}
                    required
                    value={jd}
                    onChange={(e) => setJd(e.target.value)}
                    placeholder="Paste the full job posting here (e.g. responsibilities, technical requirements, qualifications)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                      <Globe className="w-4 h-4 text-indigo-400" />
                      <span>Company Website Address</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. https://posthog.com"
                      value={companyUrl}
                      onChange={(e) => setCompanyUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
                    />
                    <p className="mt-1.5 text-xs text-slate-500 flex items-center space-x-1">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      <span>Crawler automatically searches for hiring pages & blogs</span>
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                        <Calendar className="w-4 h-4 text-purple-400" />
                        <span>Days Available</span>
                      </label>
                      <span className="text-sm font-bold text-blue-400 px-2 py-0.5 bg-blue-500/10 rounded border border-blue-500/20">
                        {days} Days Schedule
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={30}
                      value={days}
                      onChange={(e) => setDays(Number(e.target.value))}
                      className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-2">
                      <span>1 Day (Sprint)</span>
                      <span>5 Days (Standard)</span>
                      <span>30 Days (Deep Study)</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  <Upload className="w-4 h-4 text-blue-400" />
                  <span>Upload Cases File (JSON Format)</span>
                </label>
                <div className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 text-center bg-slate-950 transition">
                  <input
                    type="file"
                    accept=".json,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="batch-upload-input"
                  />
                  <label htmlFor="batch-upload-input" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-300 font-medium">Click to select JSON cases file</p>
                    <p className="text-xs text-slate-500 mt-1">Array of objects with `id`, `jd`, `company_url`, `days`</p>
                  </label>
                </div>

                {batchFileContent && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-slate-400 mb-1">File Preview:</p>
                    <textarea
                      rows={4}
                      value={batchFileContent}
                      onChange={(e) => setBatchFileContent(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-300"
                    />
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-base rounded-xl transition shadow-xl shadow-blue-600/20 flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-5 h-5" />
              <span>Generate Personalized Prep Kit</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
