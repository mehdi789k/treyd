
import React from 'react';
import type { AnalysisResult, PatternImplication } from '../types';
import { ChevronsRight, ArrowUp, ArrowDown, Minus, Rss, BarChartHorizontal, Wind } from 'lucide-react';

interface TechnicalInsightsProps {
    patterns: AnalysisResult['patterns'];
    indicators: AnalysisResult['indicators'];
}

const PatternIcon: React.FC<{implication: PatternImplication}> = ({ implication }) => {
    switch (implication) {
        case 'Bullish': return <ArrowUp className="w-5 h-5 text-green-400 flex-shrink-0" />;
        case 'Bearish': return <ArrowDown className="w-5 h-5 text-red-400 flex-shrink-0" />;
        case 'Neutral':
        default: return <Minus className="w-5 h-5 text-yellow-400 flex-shrink-0" />;
    }
}

const RsiGauge: React.FC<{ value: number }> = ({ value }) => {
    const percentage = Math.max(0, Math.min(100, value));
    let colorClass = 'bg-yellow-500';
    if (percentage > 70) colorClass = 'bg-red-500';
    else if (percentage < 30) colorClass = 'bg-green-500';

    return (
        <div className="w-full bg-gray-700 rounded-full h-2.5 my-1">
            <div className={`${colorClass} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
        </div>
    );
};

const getSignalTagStyle = (signal: string) => {
    const lowerSignal = signal.toLowerCase();
    if (lowerSignal.includes('bullish') || lowerSignal.includes('lower') || lowerSignal.includes('oversold')) {
        return 'bg-green-800/50 text-green-300 border-green-700/50';
    }
    if (lowerSignal.includes('bearish') || lowerSignal.includes('upper') || lowerSignal.includes('overbought')) {
        return 'bg-red-800/50 text-red-300 border-red-700/50';
    }
    return 'bg-yellow-800/50 text-yellow-300 border-yellow-700/50';
}

export const TechnicalInsights: React.FC<TechnicalInsightsProps> = ({ patterns, indicators }) => {
  return (
    <div className="bg-gray-800/30 p-6 rounded-xl border border-gray-700/50 shadow-lg backdrop-blur-sm flex flex-col gap-6">
        <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center text-gray-200">
                <ChevronsRight className="w-6 h-6 ml-2 text-sky-400" />
                الگوهای کلیدی
            </h3>
            <ul className="space-y-3 text-gray-400 text-sm">
                {patterns.length > 0 ? patterns.map((p, i) => (
                    <li key={i} className="flex items-start gap-3 p-3 rounded-md bg-gray-700/20 border border-gray-700/50">
                        <PatternIcon implication={p.implication} />
                        <div>
                            <strong className="text-gray-200 block">{p.name}</strong>
                            <span className="text-xs text-gray-500">{p.description}</span>
                        </div>
                    </li>
                )) : <p className="text-gray-500 text-sm">هیچ الگوی قابل توجهی شناسایی نشد.</p>}
            </ul>
        </div>
        
        <div className="border-t border-gray-700/50"></div>

        <div>
             <h3 className="text-xl font-semibold mb-4 flex items-center text-gray-200">
                <ChevronsRight className="w-6 h-6 ml-2 text-sky-400" />
                سیگنال اندیکاتورها
            </h3>
            <div className="space-y-4">
                {/* RSI */}
                <div className="p-3 rounded-md bg-gray-700/20 border border-gray-700/50">
                    <div className="flex justify-between items-center mb-1">
                        <h4 className="font-semibold text-gray-300 flex items-center gap-2"><Rss className="w-4 h-4 text-sky-400"/>RSI ({indicators.rsi.value})</h4>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getSignalTagStyle(indicators.rsi.signal)}`}>{indicators.rsi.signal}</span>
                    </div>
                    <RsiGauge value={indicators.rsi.value} />
                    <p className="text-xs text-gray-500 mt-2">{indicators.rsi.description}</p>
                </div>

                 {/* MACD */}
                <div className="p-3 rounded-md bg-gray-700/20 border border-gray-700/50">
                    <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-gray-300 flex items-center gap-2"><BarChartHorizontal className="w-4 h-4 text-sky-400"/>MACD</h4>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getSignalTagStyle(indicators.macd.signal)}`}>{indicators.macd.signal}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{indicators.macd.description}</p>
                </div>
                
                 {/* Bollinger Bands */}
                <div className="p-3 rounded-md bg-gray-700/20 border border-gray-700/50">
                    <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-gray-300 flex items-center gap-2"><Wind className="w-4 h-4 text-sky-400"/>Bollinger Bands</h4>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getSignalTagStyle(indicators.bollinger.signal)}`}>{indicators.bollinger.signal}</span>
                    </div>
                     <p className="text-xs text-gray-500 mt-2">{indicators.bollinger.description}</p>
                </div>
            </div>
        </div>
    </div>
  );
};