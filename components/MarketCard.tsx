import React from 'react';
import { MarketData } from '../types';

// Helper Subcomponent for badges
interface BadgeProps {
  children?: React.ReactNode;
  icon: 'chart' | 'cash' | 'calendar';
}

const Badge = ({ children, icon }: BadgeProps) => {
  const icons = {
    chart: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>,
    cash: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
  };

  return (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 border border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 font-medium">
      <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {icons[icon]}
      </svg>
      {children}
    </span>
  );
}

interface MarketCardProps {
  data: MarketData;
}

const MarketCard: React.FC<MarketCardProps> = ({ data }) => {
  return (
    <div className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 md:p-8 shadow-xl shadow-gray-200/50 dark:shadow-black/40 transition-all duration-300 hover:border-gray-300 dark:hover:border-slate-700">
      
      {/* Header Section */}
      <div className="flex justify-between items-start mb-6">
        <div className="w-full">
          {data.groupItemTitle && (
            <div className="text-xs font-bold tracking-wider text-blue-600 dark:text-blue-400 uppercase mb-2">
              {data.groupItemTitle}
            </div>
          )}
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4 leading-tight tracking-tight">
            {data.question}
          </h2>
          
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Badge icon="chart">Vol: {data.volume}</Badge>
            {data.liquidity && <Badge icon="cash">Liq: {data.liquidity}</Badge>}
            {data.endDate && (
               <Badge icon="calendar">{new Date(data.endDate).toLocaleDateString()}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Outcomes Section */}
      <div className="space-y-5">
        {data.outcomes.map((outcome, idx) => (
          <div key={idx} className="relative">
            <div className="flex justify-between text-sm mb-2 font-medium">
              <span className="text-gray-700 dark:text-slate-300">{outcome.name}</span>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold tabular-nums ${outcome.probability > 0.5 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-500'}`}>
                  {(outcome.probability * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out relative ${
                  outcome.probability > 0.5 
                    ? 'bg-neutral-900 dark:bg-blue-600' 
                    : 'bg-gray-300 dark:bg-slate-600'
                }`}
                style={{ width: `${outcome.probability * 100}%` }}
              >
                {/* Subtle shine effect */}
                <div className="absolute inset-0 bg-white/10 w-full h-full transform -skew-x-12 -translate-x-full animate-[shimmer_2.5s_infinite]"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Description Footer */}
      {data.description && (
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800">
          <p className="text-sm text-gray-500 dark:text-slate-400 line-clamp-3 hover:line-clamp-none transition-all cursor-pointer leading-relaxed">
            {data.description}
          </p>
        </div>
      )}
      
      <div className="mt-6 flex justify-end">
        <a 
          href={data.url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-black dark:text-slate-500 dark:hover:text-white transition-colors"
        >
          View on Polymarket
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
        </a>
      </div>
    </div>
  );
};

export default MarketCard;