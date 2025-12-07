import React from 'react';
import { AnalysisResult, AnalysisMode } from '../types';

interface AnalysisDisplayProps {
  result: AnalysisResult | null;
  mode: AnalysisMode;
  isLoading: boolean;
  onAnalyze: (mode: AnalysisMode) => void;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ result, mode, isLoading, onAnalyze }) => {
  
  const getRecStyle = (rec: string) => {
    switch(rec) {
      case 'BUY': return { 
        box: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-900/30 dark:text-green-400', 
        score: 'text-green-600 dark:text-green-400' 
      };
      case 'SELL': return { 
        box: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400', 
        score: 'text-red-600 dark:text-red-400' 
      };
      case 'HOLD': return { 
        box: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-900/30 dark:text-yellow-400', 
        score: 'text-yellow-600 dark:text-yellow-400' 
      };
      default: return { 
        box: 'bg-gray-50 border-gray-200 text-gray-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400', 
        score: 'text-gray-600 dark:text-slate-400' 
      };
    }
  };

  const recStyles = result ? getRecStyle(result.recommendation) : { box: '', score: '' };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xl shadow-gray-200/50 dark:shadow-black/40 overflow-hidden flex flex-col h-full transition-all duration-300">
      
      {/* Header / Tabs */}
      <div className="flex border-b border-gray-100 dark:border-slate-800">
        <button
          onClick={() => onAnalyze(AnalysisMode.QUICK)}
          className={`flex-1 py-4 text-sm font-semibold transition-all relative ${
            mode === AnalysisMode.QUICK 
              ? 'text-gray-900 dark:text-white bg-gray-50/50 dark:bg-slate-800/50' 
              : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'
          }`}
        >
          ⚡ Quick Analysis
          {mode === AnalysisMode.QUICK && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-neutral-900 dark:bg-blue-500"></div>}
        </button>
        <button
          onClick={() => onAnalyze(AnalysisMode.DEEP)}
          className={`flex-1 py-4 text-sm font-semibold transition-all relative ${
            mode === AnalysisMode.DEEP 
              ? 'text-purple-700 dark:text-purple-400 bg-purple-50/30 dark:bg-purple-900/10' 
              : 'text-gray-400 dark:text-slate-500 hover:text-purple-600 dark:hover:text-purple-300'
          }`}
        >
          🧠 Deep Research
          {mode === AnalysisMode.DEEP && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 dark:bg-purple-500"></div>}
        </button>
      </div>

      {/* Content Area */}
      <div className="p-6 md:p-8 flex-1 min-h-[400px] flex flex-col">
        {isLoading ? (
          <div className="m-auto flex flex-col items-center justify-center space-y-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-gray-200 dark:border-slate-800 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-neutral-900 dark:border-t-blue-500 rounded-full animate-spin"></div>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400 animate-pulse tracking-wide">
              {mode === AnalysisMode.DEEP 
                ? "SEARCHING LIVE SOURCES & ANALYZING..." 
                : "ANALYZING MARKET DATA..."}
            </p>
          </div>
        ) : !result ? (
          <div className="m-auto flex flex-col items-center justify-center text-center max-w-sm">
            <div className="w-20 h-20 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-gray-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Ready to Analyze</h3>
            <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed">
              Select an analysis mode above to let the AI research this market for you.
            </p>
          </div>
        ) : (
          <div className="space-y-8 animate-slide-up">
            {/* Recommendation Banner */}
            <div className={`flex items-center justify-between p-5 rounded-xl border ${recStyles.box} transition-colors`}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Recommendation</span>
                <div className="text-3xl font-black tracking-tight mt-1">{result.recommendation}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Confidence</span>
                <div className={`text-3xl font-black ${recStyles.score}`}>{result.confidenceScore}%</div>
              </div>
            </div>

            {/* Summary */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3">Executive Summary</h3>
              <p className="text-gray-700 dark:text-slate-300 leading-7 font-normal">
                {result.summary}
              </p>
            </div>

            {/* Reasoning Points */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3">Key Factors</h3>
              <ul className="space-y-3">
                {result.reasoning.map((point, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-neutral-900 dark:bg-blue-500 flex-shrink-0"></div>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Edge Analysis (Deep Mode Only) */}
            {mode === AnalysisMode.DEEP && (result.estimatedProbability || result.edgePercentage || result.marketEfficiency) && (
              <div className="pt-6 border-t border-gray-100 dark:border-slate-800">
                <h3 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                  Edge Analysis
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {result.estimatedProbability && (
                    <div className="p-4 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-1">Est. Probability</div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white">{result.estimatedProbability}</div>
                    </div>
                  )}
                  {result.edgePercentage && (
                    <div className="p-4 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-1">Identified Edge</div>
                      <div className={`text-xl font-bold ${result.edgePercentage.startsWith('+') ? 'text-green-600 dark:text-green-400' : result.edgePercentage.startsWith('-') ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                        {result.edgePercentage}
                      </div>
                    </div>
                  )}
                  {result.marketEfficiency && (
                    <div className="p-4 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-1">Market Efficiency</div>
                      <div className={`text-sm font-bold px-2 py-1 rounded inline-block ${
                        result.marketEfficiency === 'LOW' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        result.marketEfficiency === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {result.marketEfficiency}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Key Risks (Deep Mode Only) */}
            {mode === AnalysisMode.DEEP && result.keyRisks && result.keyRisks.length > 0 && (
              <div className="pt-6 border-t border-gray-100 dark:border-slate-800">
                <h3 className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  Key Risks
                </h3>
                <ul className="space-y-3">
                  {result.keyRisks.map((risk, idx) => (
                    <li key={idx} className="flex gap-3 text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0"></div>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sources (Deep Mode Only) */}
            {mode === AnalysisMode.DEEP && result.sources && result.sources.length > 0 && (
              <div className="pt-6 border-t border-gray-100 dark:border-slate-800">
                <h3 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>
                  Verified Sources
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {result.sources.map((source, idx) => (
                    <a 
                      key={idx}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-white border border-gray-200 hover:border-purple-300 hover:shadow-md dark:bg-slate-800 dark:hover:bg-slate-750 dark:border-slate-700 dark:hover:border-purple-500/50 transition-all group"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 truncate">
                          {source.title}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-500 truncate mt-0.5">
                          {new URL(source.url).hostname}
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-purple-500 dark:text-slate-600 dark:group-hover:text-purple-400 transform group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisDisplay;