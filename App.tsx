import React, { useState, useEffect } from 'react';
import MarketCard from './components/MarketCard';
import AnalysisDisplay from './components/AnalysisDisplay';
import Button from './components/Button';
import { getMarketData } from './services/polymarketService';
import { analyzeMarket } from './services/geminiService';
import { MarketData, AnalysisResult, AnalysisMode } from './types';

function App() {
  const [url, setUrl] = useState('');
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [mode, setMode] = useState<AnalysisMode>(AnalysisMode.QUICK);
  
  const [isFetching, setIsFetching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Theme state: 'dark' by default
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Handle Theme Toggle
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Suggested markets for demo
  const suggestions = [
    "presidential-election-winner-2024",
    "bitcoin-price-above-100k-2024",
    "will-fed-cut-rates-in-march-2024"
  ];

  const handleFetch = async (inputUrl: string) => {
    if (!inputUrl) return;
    
    setIsFetching(true);
    setError(null);
    setAnalysis(null);
    setMarketData(null); // Clear previous

    try {
      const data = await getMarketData(inputUrl);
      setMarketData(data);
      handleAnalyze(data, AnalysisMode.QUICK);
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch market data. Please check the URL and try again.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleAnalyze = async (data: MarketData, selectedMode: AnalysisMode) => {
    setIsAnalyzing(true);
    setMode(selectedMode);
    
    try {
      const result = await analyzeMarket(data, selectedMode);
      setAnalysis(result);
    } catch (err: any) {
      console.error(err);
      setError("Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onModeChange = (newMode: AnalysisMode) => {
    if (marketData && !isAnalyzing) {
      handleAnalyze(marketData, newMode);
    } else {
      setMode(newMode);
    }
  };

  return (
    <div className="min-h-screen bg-poly-light-bg dark:bg-poly-dark-bg text-poly-light-text dark:text-poly-dark-text font-sans transition-colors duration-300">
      
      {/* Navbar */}
      <nav className="border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-neutral-500/20 dark:shadow-blue-500/20">
              P
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
              Edge Explorer
            </span>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="hidden md:flex gap-2">
                <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400">
                  v2.0 Beta
                </span>
                <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                  Gemini 3 Pro
                </span>
             </div>
             
             {/* Theme Toggle Button */}
             <button 
               onClick={toggleTheme}
               className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
               aria-label="Toggle Theme"
             >
               {theme === 'dark' ? (
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
               ) : (
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
               )}
             </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        
        {/* Hero Section */}
        <section className="max-w-3xl mx-auto text-center mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
            Find the Market <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-800 to-neutral-500 dark:from-blue-400 dark:to-purple-500">Edge</span>
          </h1>
          <p className="text-lg text-gray-500 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Advanced AI analysis for prediction markets. Combine real-time odds with deep web research to uncover profitable opportunities.
          </p>
        </section>

        {/* Input Section */}
        <section className="max-w-2xl mx-auto mb-16 relative z-10">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-blue-600 dark:to-purple-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
            <div className="relative flex items-center bg-white dark:bg-slate-900 p-2 rounded-xl shadow-2xl shadow-gray-200/50 dark:shadow-black/50 border border-gray-100 dark:border-slate-700">
              <div className="pl-4 pr-3 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
              <input 
                type="text" 
                placeholder="Paste URL or search market..." 
                className="flex-1 bg-transparent border-none text-gray-900 dark:text-white px-2 py-3 focus:outline-none placeholder-gray-400 text-base"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFetch(url)}
              />
              <Button 
                onClick={() => handleFetch(url)}
                isLoading={isFetching}
                disabled={!url}
                className="ml-2"
              >
                Analyze
              </Button>
            </div>
          </div>

          {/* Quick Suggestions */}
          {!marketData && (
            <div className="mt-8 text-center animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4">Trending Markets</p>
              <div className="flex flex-wrap justify-center gap-3">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setUrl(s);
                      handleFetch(s);
                    }}
                    className="text-sm px-4 py-2 rounded-full bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-500 hover:shadow-sm transition-all"
                  >
                    {s.split('-').slice(0, 3).join(' ')}...
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Error Notification */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 animate-fade-in">
             <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-center text-sm font-medium">
                {error}
             </div>
          </div>
        )}

        {/* Results Section */}
        {marketData && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-slide-up">
            
            {/* Left: Market Info */}
            <div className="lg:col-span-5 space-y-6">
              <MarketCard data={marketData} />
              
              <div className="hidden lg:block p-6 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  How Analysis Works
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
                  The AI compares implied probabilities against real-world data.
                </p>
                <div className="mt-4 space-y-3">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Fetches live market liquidity and volume.</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Deep mode searches Google for breaking news.</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Generates a confidence score and trade recommendation.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: AI Analysis */}
            <div className="lg:col-span-7">
              <AnalysisDisplay 
                result={analysis} 
                mode={mode} 
                isLoading={isAnalyzing} 
                onAnalyze={onModeChange}
              />
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;