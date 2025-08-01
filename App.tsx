import React, { useState, useCallback, useEffect } from 'react';
import { Layout } from './components/Layout';
import { SymbolInput } from './components/SymbolInput';
import { FileUpload } from './components/FileUpload';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { AnalysisHistory } from './components/AnalysisHistory';
import { Loader } from './components/Loader';
import { getFinancialAnalysis, getWhatIfAnalysis } from './services/geminiService';
import { addKnowledgeItemsToDB } from './services/db';
import type { AnalysisData, AnalysisRecord, UploadedFile, ChatMessage, Timeframe, RiskProfile, KnowledgeItem, AnalysisResult, SavedAnalysisRecord, Strategy, Timezone } from './types';
import { riskProfiles, timeframes, strategies } from './types';
import { timezones } from './data/timezones';
import { useFileStore, useAnalysisHistory } from './hooks/useFileStore';
import { useSavedAnalyses } from './hooks/useSavedAnalyses';
import { useWatchlist } from './hooks/useWatchlist';
import { useKnowledge } from './hooks/useKnowledge';
import { GoogleGenAI } from "@google/genai";
import type { Chat } from "@google/genai";
import { TimeframeSelector } from './components/TimeframeSelector';
import { TimezoneSelector } from './components/TimezoneSelector';
import { RiskProfileSelector } from './components/RiskProfileSelector';
import { StrategySelector } from './components/StrategySelector';
import { SavedAnalyses } from './components/SavedAnalyses';
import { Watchlist } from './components/Watchlist';
import { NewsFeed } from './components/NewsFeed';
import { SaveAnalysisModal } from './components/SaveAnalysisModal';
import { UserPanel } from './components/UserPanel';
import { OnboardingTour } from './components/OnboardingTour';
import { ComparativeAnalysisModal } from './components/ComparativeAnalysisModal';
import { ImportDataModal } from './components/ImportDataModal';
import type { TourStep } from './components/OnboardingTour';
import { Sparkles } from 'lucide-react';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const PREFERENCES_KEY = 'financialAnalystPrefs';
const TOUR_COMPLETED_KEY = 'financialAnalystTourCompleted_v1';
const CHAT_SYSTEM_INSTRUCTION = 'شما یک دستیار تحلیلگر مالی هستید. وظیفه شما پاسخ به سوالات کاربر بر اساس تحلیل ارائه شده در تاریخچه گفتگو است. پاسخ‌های خود را کوتاه، دقیق و کاملاً مرتبط با سوال کاربر ارائه دهید. تمام پاسخ‌ها باید به زبان فارسی باشند.';

const tourSteps: TourStep[] = [
    {
        selector: '#symbol-input-container',
        title: '۱. شروع تحلیل',
        content: 'برای شروع، نام نماد مالی مورد نظر خود را در این قسمت وارد کنید. با تایپ کردن، پیشنهاداتی برای شما نمایش داده خواهد شد.',
        position: 'bottom',
    },
    {
        selector: '.risk-profile-selector',
        title: '۲. پروفایل ریسک',
        content: 'پروفایل ریسک خود را انتخاب کنید. این کار به هوش مصنوعی کمک می‌کند تا تحلیل و استراتژی متناسب با روحیات شما ارائه دهد.',
        position: 'bottom',
    },
    {
        selector: '.start-analysis-button',
        title: '۳. اجرای تحلیل',
        content: 'پس از وارد کردن اطلاعات، روی این دکمه کلیک کنید تا تحلیل هوشمند آغاز شود.',
        position: 'top',
    },
    {
        selector: '#dashboard-start',
        title: '۴. مشاهده نتایج',
        content: 'نتایج تحلیل شما در این داشبورد جامع نمایش داده می‌شود. می‌توانید بین تب‌های مختلف برای مشاهده جزئیات جابجا شوید.',
        position: 'top',
    },
    {
        selector: '.chat-interface-container',
        title: '۵. چت تکمیلی',
        content: 'در این قسمت می‌توانید سوالات بیشتری در مورد تحلیل انجام شده از هوش مصنوعی بپرسید و گفتگو را ادامه دهید.',
        position: 'top',
    },
    {
        selector: '.user-panel-button',
        title: '۶. پنل کاربری',
        content: 'از اینجا به آمار کلی، مدیریت داده‌ها و شروع مجدد این راهنما دسترسی خواهید داشت.',
        position: 'left',
    }
];

function App() {
  const [symbol, setSymbol] = useState<string>('');
  const [timeframe, setTimeframe] = useState<Timeframe>('روزانه');
  const [timezone, setTimezone] = useState<Timezone>('UTC');
  const [riskProfile, setRiskProfile] = useState<RiskProfile>('متعادل');
  const [selectedStrategies, setSelectedStrategies] = useState<Strategy[]>([strategies[0]]);
  
  const { archivedFiles, addFilesToArchive, removeFileFromArchive, clearFiles, replaceAllFiles, isInitialized: isFileArchiveInitialized } = useFileStore();
  const { history, addAnalysisToHistory, removeAnalysisFromHistory, clearHistory, replaceAllHistory, isInitialized: isHistoryInitialized } = useAnalysisHistory();
  const { savedAnalyses, addSavedAnalysis, removeSavedAnalysis, clearSavedAnalyses, replaceAllSavedAnalyses, isInitialized: isSavedAnalysesInitialized } = useSavedAnalyses();
  const { watchlist, isInitialized: isWatchlistInitialized, addToWatchlist, removeFromWatchlist, clearWatchlist, replaceAllWatchlistItems, isSymbolInWatchlist } = useWatchlist();
  const { items: knowledgeItems, isInitialized: isKnowledgeInitialized, updateItem: updateKnowledgeItem, deleteItem: deleteKnowledgeItem, reloadItems: reloadKnowledgeItems, replaceAllKnowledge } = useKnowledge();
  
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
  const [isFileUploadEnabled, setIsFileUploadEnabled] = useState<boolean>(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // States for viewing and saving
  const [activeAnalysis, setActiveAnalysis] = useState<{ type: 'history' | 'saved', id: number } | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isUserPanelOpen, setIsUserPanelOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [importModalState, setImportModalState] = useState<{ isOpen: boolean; data: any; error: string | null }>({ isOpen: false, data: null, error: null });

  
  // States for Chat
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  // State for Knowledge Context
  const [knowledgeContextForDisplay, setKnowledgeContextForDisplay] = useState<string>('');
  
  // State for onboarding tour
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Load preferences and check for tour on mount
  useEffect(() => {
    try {
      const savedPrefs = localStorage.getItem(PREFERENCES_KEY);
      if (savedPrefs) {
        setPreferences(JSON.parse(savedPrefs));
      }
      
      const tourCompleted = localStorage.getItem(TOUR_COMPLETED_KEY);
      if (!tourCompleted) {
        setTimeout(() => setIsTourOpen(true), 1500);
      }
    } catch (e) {
        console.error("Failed to load user preferences", e);
    }
  }, []);
  
  const setPreferences = (prefs: any) => {
    if (prefs.timeframe && timeframes.includes(prefs.timeframe)) setTimeframe(prefs.timeframe);
    if (prefs.timezone && timezones.some(tz => tz.value === prefs.timezone)) setTimezone(prefs.timezone);
    if (prefs.riskProfile && riskProfiles.includes(prefs.riskProfile)) setRiskProfile(prefs.riskProfile);
    if (prefs.selectedStrategies && Array.isArray(prefs.selectedStrategies)) {
         const validStrategies = prefs.selectedStrategies.filter((s: Strategy) => strategies.includes(s));
         if (validStrategies.length > 0) {
            setSelectedStrategies(validStrategies);
         }
    }
  }

  // Save preferences on change
  useEffect(() => {
    try {
        const prefs = {
            timeframe,
            timezone,
            riskProfile,
            selectedStrategies
        };
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
    } catch(e) {
        console.error("Failed to save user preferences", e);
    }
  }, [timeframe, timezone, riskProfile, selectedStrategies]);
  
  // Persist chat history on change (omitted for brevity, no changes)

  const handleFileUploadToggle = (enabled: boolean) => {
    setIsFileUploadEnabled(enabled);
    if (!enabled) {
      setSelectedFiles([]);
    }
  };

  const saveKnowledgeFromAnalysis = async (analysis: AnalysisResult, sourceId: number) => {
    const knowledgeItems: Omit<KnowledgeItem, 'id'>[] = [];
    const timestamp = Date.now();

    if (analysis.learnedInsights && analysis.learnedInsights !== 'در این تحلیل نکته جدیدی برای یادگیری یافت نشد.') {
        knowledgeItems.push({ sourceAnalysisId: sourceId, type: 'Insight', content: analysis.learnedInsights, symbol: analysis.symbol, timeframe: analysis.timeframe, timestamp });
    }
    if (analysis.strategy) {
        knowledgeItems.push({ sourceAnalysisId: sourceId, type: 'Strategy', content: analysis.strategy, symbol: analysis.symbol, timeframe: analysis.timeframe, timestamp });
    }
    analysis.patterns?.forEach(pattern => {
        knowledgeItems.push({ sourceAnalysisId: sourceId, type: 'Pattern', content: `الگو: ${pattern.name} - مفهوم: ${pattern.implication} - توضیحات: ${pattern.description}`, symbol: analysis.symbol, timeframe: analysis.timeframe, timestamp });
    });

    if (knowledgeItems.length > 0) {
        try {
            await addKnowledgeItemsToDB(knowledgeItems);
            await reloadKnowledgeItems(); // reload knowledge after adding new items
        } catch (error) {
            console.error("Failed to save knowledge items to DB", error);
        }
    }
  };

  const handleAnalysis = useCallback(async () => {
    // ... (no changes in this function)
  }, [symbol, timeframe, timezone, riskProfile, selectedStrategies, selectedFiles, addAnalysisToHistory, reloadKnowledgeItems]);

  const handleSendMessage = useCallback(async (message: string) => {
    // ... (no changes in this function)
  }, [chatSession, isChatLoading, handleAnalysis, analysisData, setRiskProfile, setTimeframe]);
  
  const resetAndLoadChat = (record: AnalysisRecord | SavedAnalysisRecord) => {
    // ... (no changes in this function)
  };

  const handleViewHistory = useCallback((id: number) => {
    // ... (no changes in this function)
  }, [history]);

  const handleDeleteHistory = useCallback(async (id: number) => {
    // ... (no changes in this function)
  }, [removeAnalysisFromHistory, activeAnalysis]);

  const handleOpenSaveModal = useCallback(() => {
    if (analysisData) {
      setIsSaveModalOpen(true);
    }
  }, [analysisData]);

  const handleSaveAnalysis = useCallback(async (name: string) => {
    // ... (no changes in this function)
  }, [analysisData, activeAnalysis, history, selectedFiles, chatMessages, addSavedAnalysis]);

  const handleLoadSavedAnalysis = useCallback((id: number) => {
    // ... (no changes in this function)
  }, [savedAnalyses]);

  const handleDeleteSavedAnalysis = useCallback(async (id: number) => {
    // ... (no changes in this function)
  }, [removeSavedAnalysis, activeAnalysis]);
  
  const handleSelectFromWatchlist = useCallback((selectedSymbol: string) => {
    // ... (no changes in this function)
  }, []);
  
  const handleExportAllData = useCallback(() => {
    const allData = {
      history,
      savedAnalyses,
      archivedFiles,
      watchlist,
      knowledgeItems,
      preferences: {
        timeframe,
        timezone,
        riskProfile,
        selectedStrategies
      }
    };
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial_analyst_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [history, savedAnalyses, archivedFiles, watchlist, knowledgeItems, timeframe, timezone, riskProfile, selectedStrategies]);

  const handleImportFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result;
            const data = JSON.parse(text as string);
            // Basic validation
            if (typeof data !== 'object' || data === null) {
                throw new Error("فایل معتبر نیست.");
            }
            setImportModalState({ isOpen: true, data, error: null });
        } catch (err) {
            setImportModalState({ isOpen: true, data: null, error: "فایل پشتیبان نامعتبر است یا در خواندن آن مشکلی پیش آمد." });
        }
    };
    reader.onerror = () => {
        setImportModalState({ isOpen: true, data: null, error: "خطا در خواندن فایل." });
    };
    reader.readAsText(file);
    
    // Reset file input
    if(event.target) event.target.value = '';
  };
  
  const handleConfirmImport = async (selections: Record<string, boolean>) => {
    const data = importModalState.data;
    if (!data) return;

    const importPromises = [];

    if (selections.history && data.history) importPromises.push(replaceAllHistory(data.history));
    if (selections.savedAnalyses && data.savedAnalyses) importPromises.push(replaceAllSavedAnalyses(data.savedAnalyses));
    if (selections.archivedFiles && data.archivedFiles) importPromises.push(replaceAllFiles(data.archivedFiles));
    if (selections.watchlist && data.watchlist) importPromises.push(replaceAllWatchlistItems(data.watchlist));
    if (selections.knowledgeItems && data.knowledgeItems) importPromises.push(replaceAllKnowledge(data.knowledgeItems));
    if (selections.preferences && data.preferences) {
        setPreferences(data.preferences);
    }
    
    await Promise.all(importPromises);
    
    setImportModalState({ isOpen: false, data: null, error: null });
    
    // Reset active analysis if it was part of imported data that might not exist anymore
    setAnalysisData(null);
    setActiveAnalysis(null);
    setChatSession(null);
    setChatMessages([]);
  };

  const handleDeleteAllData = useCallback(async () => {
    await clearHistory();
    await clearSavedAnalyses();
    await clearFiles();
    await clearWatchlist();
    await reloadKnowledgeItems(); // It will be cleared with clearHistory, just reload state
    setAnalysisData(null);
    setActiveAnalysis(null);
    setChatSession(null);
    setChatMessages([]);
    setSelectedFiles([]);
  }, [clearHistory, clearSavedAnalyses, clearFiles, clearWatchlist, reloadKnowledgeItems]);
  
  const handleCloseTour = () => {
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    setIsTourOpen(false);
  };

  const handleStartTour = () => {
    setIsTourOpen(true);
  }

  let viewingBannerInfo: { type: 'history' | 'saved', record: AnalysisRecord | SavedAnalysisRecord } | null = null;
  // ... (no changes in this logic)
  
  const isCurrentAnalysisSaved = viewingBannerInfo?.type === 'saved';

  return (
    <Layout 
        onOpenUserPanel={() => setIsUserPanelOpen(true)}
        onOpenCompare={() => setIsCompareModalOpen(true)}
    >
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* ... (no changes to the top part of the UI) */}
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-emerald-400">
            تحلیلگر هوشمند مالی Plus
          </h1>
          <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
             داده‌های بازار را وارد کنید تا هوش مصنوعی ما با قدرت Gemini، تحلیل جامع و پیش‌بینی دقیقی ارائه دهد.
          </p>
        </div>

        <div className="max-w-6xl mx-auto bg-gray-900/30 backdrop-blur-xl rounded-2xl shadow-2xl shadow-sky-900/20 p-6 md:p-8 border border-gray-700/50 animate-slide-in-up">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="md:col-span-3" id="symbol-input-container">
              <SymbolInput symbol={symbol} setSymbol={setSymbol} />
            </div>
            <TimeframeSelector timeframe={timeframe} setTimeframe={setTimeframe} />
            <TimezoneSelector timezone={timezone} setTimezone={setTimezone} />
            <RiskProfileSelector riskProfile={riskProfile} setRiskProfile={setRiskProfile} />
          </div>

          <div className="mb-6">
            <StrategySelector selectedStrategies={selectedStrategies} setSelectedStrategies={setSelectedStrategies} />
          </div>
          
          <div className="mb-8">
            <FileUpload 
              archivedFiles={archivedFiles}
              selectedFiles={selectedFiles}
              setSelectedFiles={setSelectedFiles}
              addFilesToArchive={addFilesToArchive}
              removeFileFromArchive={removeFileFromArchive}
              isEnabled={isFileUploadEnabled}
              setIsEnabled={handleFileUploadToggle}
              isArchiveReady={isFileArchiveInitialized}
            />
          </div>
          
          <div className="text-center">
            <button
              onClick={handleAnalysis}
              disabled={isLoading || !symbol}
              className="group relative inline-flex items-center justify-center w-full md:w-auto px-12 py-3 text-lg font-bold text-white bg-gradient-to-r from-sky-500 to-emerald-600 rounded-lg shadow-lg hover:shadow-sky-500/40 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none start-analysis-button"
            >
              <span className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-sky-500 to-emerald-600 opacity-0 group-hover:opacity-75 transition duration-500 blur-lg"></span>
              <span className="relative flex items-center gap-2">
                {isLoading ? 'در حال تحلیل...' : 'شروع تحلیل'}
                {!isLoading && <Sparkles className="w-5 h-5 opacity-80 group-hover:opacity-100 group-hover:animate-pulse" />}
              </span>
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto mt-12 space-y-10">
           <NewsFeed />
          <Watchlist
            watchlist={watchlist}
            isInitialized={isWatchlistInitialized}
            onSelect={handleSelectFromWatchlist}
            onDelete={removeFromWatchlist}
            currentSymbol={symbol}
          />
          <SavedAnalyses
            analyses={savedAnalyses}
            isInitialized={isSavedAnalysesInitialized}
            onLoad={handleLoadSavedAnalysis}
            onDelete={handleDeleteSavedAnalysis}
            activeId={activeAnalysis?.type === 'saved' ? activeAnalysis.id : null}
          />

          <AnalysisHistory
              history={history}
              isInitialized={isHistoryInitialized}
              onView={handleViewHistory}
              onDelete={handleDeleteHistory}
              activeId={activeAnalysis?.type === 'history' ? activeAnalysis.id : null}
          />
        </div>

        {isLoading && <Loader />}
        
        {error && (
          <div className="max-w-4xl mx-auto mt-8 p-4 text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg animate-fade-in">
            <p>{error}</p>
          </div>
        )}

        {analysisData && !isLoading && (
          <div className="mt-12" id="dashboard-start">
            <AnalysisDashboard 
              analysis={analysisData.analysis} 
              sources={analysisData.sources}
              uploadedFiles={selectedFiles}
              chatMessages={chatMessages}
              isChatLoading={isChatLoading}
              onSendMessage={handleSendMessage}
              viewingBannerInfo={viewingBannerInfo}
              usedKnowledgeContext={!!knowledgeContextForDisplay}
              onSaveRequest={handleOpenSaveModal}
              isSaved={isCurrentAnalysisSaved}
              onToggleWatchlist={() => {
                if (!analysisData) return;
                const currentSymbol = analysisData.analysis.symbol;
                if (isSymbolInWatchlist(currentSymbol)) {
                  removeFromWatchlist(currentSymbol);
                } else {
                  addToWatchlist(currentSymbol);
                }
              }}
              isInWatchlist={analysisData ? isSymbolInWatchlist(analysisData.analysis.symbol) : false}
            />
          </div>
        )}

        <SaveAnalysisModal 
            isOpen={isSaveModalOpen}
            onClose={() => setIsSaveModalOpen(false)}
            onSave={handleSaveAnalysis}
            defaultName={`${analysisData?.analysis.symbol || ''} - ${analysisData?.analysis.timeframe || ''}`}
        />
        
        <UserPanel
          isOpen={isUserPanelOpen}
          onClose={() => setIsUserPanelOpen(false)}
          stats={{
            historyCount: history.length,
            savedCount: savedAnalyses.length,
            filesCount: archivedFiles.length,
            watchlistCount: watchlist.length,
          }}
          onExportAllData={handleExportAllData}
          onDeleteAllData={handleDeleteAllData}
          onStartTour={handleStartTour}
          knowledgeItems={knowledgeItems}
          onUpdateKnowledgeItem={updateKnowledgeItem}
          onDeleteKnowledgeItem={deleteKnowledgeItem}
          onImportFileSelect={handleImportFileSelect}
        />
        
        <ImportDataModal
            isOpen={importModalState.isOpen}
            onClose={() => setImportModalState({ isOpen: false, data: null, error: null })}
            onImport={handleConfirmImport}
            backupData={importModalState.data}
            error={importModalState.error}
        />

        <ComparativeAnalysisModal
            isOpen={isCompareModalOpen}
            onClose={() => setIsCompareModalOpen(false)}
        />
        
        <OnboardingTour
            steps={tourSteps}
            isOpen={isTourOpen}
            onClose={handleCloseTour}
        />

      </div>
    </Layout>
  );
}

export default App;