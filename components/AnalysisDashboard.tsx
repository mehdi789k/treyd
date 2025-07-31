
import React, { useState } from 'react';
import type { AnalysisResult, UploadedFile, GroundingSource, ChatMessage, AnalysisRecord, SavedAnalysisRecord } from '../types';
import { SummaryCard } from './SummaryCard';
import { TargetsTable } from './TargetsTable';
import { CandlestickChart } from './CandlestickChart';
import { FileList } from './FileList';
import { ConfidenceGauge } from './ConfidenceGauge';
import { GroundingSources } from './GroundingSources';
import { ChatInterface } from './ChatInterface';
import { TechnicalInsights } from './TechnicalInsights';
import { SentimentGauge } from './SentimentGauge';
import { TrendingUp, TrendingDown, BrainCircuit, Signal, ShieldAlert, GitCompareArrows, AlertTriangle, Newspaper, Sparkles, FileText, BarChart, BookOpen, Activity, Save, CheckCircle, Lightbulb, Check } from 'lucide-react';
import { formatTimestamp } from '../data/symbols';

interface AnalysisDashboardProps {
  analysis: AnalysisResult;
  sources: GroundingSource[];
  uploadedFiles: UploadedFile[];
  chatMessages: ChatMessage[];
  isChatLoading: boolean;
  onSendMessage: (message: string) => void;
  viewingBannerInfo: { type: 'history' | 'saved', record: AnalysisRecord | SavedAnalysisRecord } | null;
  usedKnowledgeContext: boolean;
  onSaveRequest: () => void;
  isSaved: boolean;
  timezone: string;
  chatSuggestions: string[];
}

type Tab = 'summary' | 'chart' | 'data';

const getSignalColor = (signal: AnalysisResult['signal']) => {
  switch (signal) {
    case 'خرید قوی': return 'text-emerald-400';
    case 'خرید': return 'text-green-400';
    case 'نگهداری': return 'text-yellow-400';
    case 'فروش': return 'text-red-400';
    case 'فروش قوی': return 'text-rose-500';
    default: return 'text-gray-400';
  }
};

const getRiskColor = (risk: AnalysisResult['riskLevel']) => {
    switch (risk) {
        case 'پایین': return 'text-green-400';
        case 'متوسط': return 'text-yellow-400';
        case 'بالا': return 'text-red-400';
        default: return 'text-gray-400';
    }
}

const TabButton: React.FC<{active: boolean; onClick: () => void; children: React.ReactNode; icon: React.ReactNode}> = ({ active, onClick, children, icon }) => (
  <button
    onClick={onClick}
    className={`relative flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-all duration-300 w-full md:w-auto
      ${active
        ? 'text-sky-300'
        : 'text-gray-400 hover:text-gray-100'
      }`}
  >
    {icon}
    <span className="relative z-10">{children}</span>
    {active && (
        <span
         className="absolute inset-x-0 bottom-0 h-0.5 bg-sky-400 rounded-full z-0 underline-grow-active"
       ></span>
    )}
  </button>
);


export const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ 
  analysis, 
  sources, 
  uploadedFiles,
  chatMessages,
  isChatLoading,
  onSendMessage,
  viewingBannerInfo,
  usedKnowledgeContext,
  onSaveRequest,
  isSaved,
  timezone,
  chatSuggestions,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('summary');

  let bannerContent = null;
  if (viewingBannerInfo) {
    const { type, record } = viewingBannerInfo;
    const dateStr = formatTimestamp(record.timestamp, timezone);
    if (type === 'history') {
      bannerContent = (
        <div className="bg-blue-900/40 border border-blue-700 text-blue-200 p-4 rounded-xl flex items-center justify-center shadow-lg animate-fade-in">
          <AlertTriangle className="w-6 h-6 ml-3 flex-shrink-0" />
          <p className="font-semibold text-sm md:text-base">
            شما در حال مشاهده یک تحلیل آرشیو شده از تاریخ {dateStr} در تایم فریم {record.timeframe || 'نامشخص'} هستید.
          </p>
        </div>
      );
    } else if (type === 'saved') {
      const savedRecord = record as SavedAnalysisRecord;
      bannerContent = (
         <div className="bg-amber-900/40 border border-amber-700 text-amber-200 p-4 rounded-xl flex items-center justify-center shadow-lg animate-fade-in">
          <AlertTriangle className="w-6 h-6 ml-3 flex-shrink-0" />
          <p className="font-semibold text-sm md:text-base">
            شما در حال مشاهده تحلیل ذخیره شده "{savedRecord.name}" هستید (ذخیره در {dateStr}).
          </p>
        </div>
      );
    }
  }


  const renderContent = () => {
    switch(activeTab) {
      case 'summary':
        return (
          <div className="space-y-6 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <SummaryCard 
                  title="سیگنال اصلی"
                  value={analysis.signal}
                  icon={<Signal className={`w-8 h-8 ${getSignalColor(analysis.signal)}`} />}
                  description="توصیه معاملاتی بر اساس تحلیل جامع."
                  valueClassName={getSignalColor(analysis.signal)}
                />
                <SummaryCard
                  title="سطح ریسک"
                  value={analysis.riskLevel}
                  icon={<ShieldAlert className={`w-8 h-8 ${getRiskColor(analysis.riskLevel)}`} />}
                  description="ارزیابی ریسک سرمایه‌گذاری."
                  valueClassName={getRiskColor(analysis.riskLevel)}
                />
                <SummaryCard
                  title="ریسک/ریوارد"
                  value={analysis.riskRewardRatio || 'N/A'}
                  icon={<GitCompareArrows className="w-8 h-8 text-sky-400"/>}
                  description="نسبت ریسک به سود احتمالی."
                />
                <SummaryCard
                  title="امتیاز اطمینان"
                  value={<ConfidenceGauge value={analysis.confidence} />}
                  icon={<BrainCircuit className="w-8 h-8 text-purple-400"/>}
                  description="میزان اطمینان AI به این تحلیل."
                />
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-gray-800/30 p-6 rounded-xl border border-gray-700/50 shadow-lg flex flex-col items-center justify-center backdrop-blur-sm">
                    <h3 className="text-lg font-semibold text-gray-200 mb-4">احساسات بازار</h3>
                    <SentimentGauge score={analysis.sentimentScore} text={analysis.sentiment} />
                </div>
                <div className="lg:col-span-2 bg-gray-800/30 p-6 rounded-xl border border-gray-700/50 shadow-lg backdrop-blur-sm">
                    <h3 className="text-xl font-semibold mb-4 text-gray-200">خلاصه و استراتژی</h3>
                    <p className="text-gray-300 leading-relaxed text-sm mb-4">{analysis.summary}</p>
                    <h4 className="font-semibold text-gray-200 mt-4 mb-2">استراتژی معاملاتی پیشنهادی:</h4>
                    <p className="text-gray-300 leading-relaxed text-sm whitespace-pre-line">{analysis.strategy}</p>
                     <h4 className="font-semibold text-gray-200 mt-4 mb-2">پیش‌بینی کوتاه‌مدت:</h4>
                    <p className="text-gray-400 text-sm">{analysis.prediction}</p>
                </div>
            </div>
            
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {analysis.keyTakeaways && analysis.keyTakeaways.length > 0 && (
                  <div className="bg-gray-800/30 p-6 rounded-xl border border-gray-700/50 shadow-lg backdrop-blur-sm">
                    <h3 className="text-xl font-semibold mb-4 flex items-center text-sky-300">
                      <Check className="w-6 h-6 ml-2 text-sky-400" />
                      نکات کلیدی
                    </h3>
                    <ul className="space-y-3">
                      {analysis.keyTakeaways.map((item, index) => (
                         <li key={index} className="flex items-start gap-3 animate-slide-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                            <div className="w-4 h-4 mt-1 rounded-full bg-sky-500/50 flex-shrink-0"></div>
                            <span className="text-gray-300 text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.proTip && (
                  <div className="bg-gray-800/30 p-6 rounded-xl border border-gray-700/50 shadow-lg backdrop-blur-sm">
                    <h3 className="text-xl font-semibold mb-4 flex items-center text-amber-300">
                      <Lightbulb className="w-6 h-6 ml-2 text-amber-400" />
                      دیدگاه حرفه‌ای
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed">{analysis.proTip}</p>
                  </div>
                )}
             </div>

            {analysis.learnedInsights && analysis.learnedInsights !== 'در این تحلیل نکته جدیدی برای یادگیری یافت نشد.' && (
                <div className="bg-gradient-to-br from-purple-800/30 via-gray-800/30 to-gray-800/30 p-6 rounded-xl border border-purple-700/60 shadow-lg animate-fade-in backdrop-blur-sm">
                  <h3 className="text-xl font-semibold mb-4 flex items-center text-purple-300">
                    <Sparkles className="w-6 h-6 ml-2 text-purple-400" />
                    آموخته‌های جدید AI
                  </h3>
                  <p className="text-gray-300 leading-relaxed text-sm whitespace-pre-line">{analysis.learnedInsights}</p>
                  <p className="text-xs text-purple-400/80 mt-4">
                    هوش مصنوعی این نکات را از طریق جستجو در وب برای بهبود تحلیل‌های آینده آموخته است.
                  </p>
                </div>
            )}
          </div>
        );
      case 'chart':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-gray-800/30 p-4 md:p-6 rounded-xl border border-gray-700/50 shadow-lg backdrop-blur-sm">
                    <h3 className="text-xl font-semibold mb-4 flex items-center text-gray-200">نمودار قیمت و اهداف</h3>
                    <CandlestickChart
                        candlestickData={analysis.candlestickData}
                        predictionData={analysis.priceChartData}
                        buyTargets={analysis.buyTargets}
                        sellTargets={analysis.sellTargets}
                        stopLoss={analysis.stopLoss}
                        timezone={timezone}
                     />
                </div>
                <TechnicalInsights
                    patterns={analysis.patterns}
                    indicators={analysis.indicators}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TargetsTable title="اهداف خرید (ورود)" targets={analysis.buyTargets} type="buy" />
                <TargetsTable title="اهداف فروش (خروج)" targets={analysis.sellTargets} type="sell" />
            </div>
          </div>
        );
      case 'data':
         return (
            <div className="space-y-6 animate-fade-in">
                {analysis.newsSummary && analysis.newsSummary !== 'هیچ خبر قابل توجهی یافت نشد.' && (
                    <div className="bg-gray-800/30 p-6 rounded-xl border border-gray-700/50 shadow-lg backdrop-blur-sm">
                        <h3 className="text-xl font-semibold mb-3 flex items-center text-gray-200">
                            <Newspaper className="w-6 h-6 ml-2 text-sky-400" />
                            خلاصه اخبار تاثیرگذار
                        </h3>
                        <p className="text-gray-300 leading-relaxed text-sm">
                            {analysis.newsSummary}
                        </p>
                    </div>
                )}
                {sources.length > 0 && <GroundingSources sources={sources} />}
                {uploadedFiles.length > 0 && (
                    <div className="bg-gray-800/30 p-6 rounded-xl border border-gray-700/50 shadow-lg backdrop-blur-sm">
                        <h3 className="text-xl font-semibold mb-4 flex items-center text-gray-200">
                            <FileText className="w-6 h-6 ml-2 text-sky-400" />
                            فایل‌های استفاده شده در تحلیل
                        </h3>
                        <FileList files={uploadedFiles} />
                    </div>
                )}
            </div>
         );
      default:
        return null;
    }
  }

  const isViewingNonLive = !!viewingBannerInfo;
  const isChatDisabled = isViewingNonLive;


  return (
    <div className="space-y-6 animate-slide-in-up">
      {bannerContent}
      
      {usedKnowledgeContext && !isViewingNonLive && (
          <div className="bg-purple-900/40 border border-purple-700 text-purple-200 p-4 rounded-xl flex items-center justify-center shadow-lg animate-fade-in">
            <BrainCircuit className="w-6 h-6 ml-3" />
            <p className="font-semibold text-sm md:text-base">
              این تحلیل با استفاده از دانش آموخته شده از تحلیل‌های پیشین بهبود یافته است.
            </p>
          </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center">
          نتایج تحلیل برای <span className="text-sky-400">{analysis.symbol}</span>
          <span className="text-xl font-medium text-gray-400 mr-2">({analysis.timeframe})</span>
        </h2>
        
        <button
            onClick={onSaveRequest}
            disabled={isSaved || isViewingNonLive}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border transition-all duration-300 transform hover:scale-105
              ${isSaved
                ? 'bg-emerald-800/30 border-emerald-700/60 text-emerald-300 cursor-default'
                : 'bg-amber-800/30 border-amber-700/60 text-amber-300 hover:bg-amber-700/50 hover:border-amber-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
              }`}
        >
            {isSaved ? <CheckCircle size={18} /> : <Save size={18} />}
            {isSaved ? 'تحلیل ذخیره شد' : 'ذخیره تحلیل'}
        </button>
      </div>
      
      <div className="bg-gray-900/30 rounded-xl border border-gray-700/50 shadow-lg backdrop-blur-xl">
        <div className="flex flex-col md:flex-row items-center justify-center border-b border-gray-700/50">
            <TabButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} icon={<Activity size={18}/>}>
                خلاصه و استراتژی
            </TabButton>
             <TabButton active={activeTab === 'chart'} onClick={() => setActiveTab('chart')} icon={<BarChart size={18}/>}>
                نمودار و تکنیکال
            </TabButton>
             <TabButton active={activeTab === 'data'} onClick={() => setActiveTab('data')} icon={<BookOpen size={18}/>}>
                اخبار و منابع
            </TabButton>
        </div>

        <div className="p-4 md:p-6">
            {renderContent()}
        </div>
      </div>
      
      {!isChatDisabled && (
        <ChatInterface
          messages={chatMessages}
          isLoading={isChatLoading}
          onSendMessage={onSendMessage}
          suggestions={chatSuggestions}
        />
      )}
    </div>
  );
};
