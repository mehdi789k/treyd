
import React, { useState, useCallback } from 'react';
import { Layout } from './components/Layout';
import { SymbolInput } from './components/SymbolInput';
import { FileUpload } from './components/FileUpload';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { AnalysisHistory } from './components/AnalysisHistory';
import { Loader } from './components/Loader';
import { getFinancialAnalysis } from './services/geminiService';
import { getKnowledgeForContextFromDB, addKnowledgeItemsToDB } from './services/db';
import type { AnalysisData, AnalysisRecord, UploadedFile, ChatMessage, Timeframe, RiskProfile, KnowledgeItem, AnalysisResult, SavedAnalysisRecord } from './types';
import { riskProfiles, timeframes } from './types';
import { useFileStore, useAnalysisHistory } from './hooks/useFileStore';
import { useSavedAnalyses } from './hooks/useSavedAnalyses';
import { GoogleGenAI } from "@google/genai";
import type { Chat } from "@google/genai";
import { TimeframeSelector } from './components/TimeframeSelector';
import { RiskProfileSelector } from './components/RiskProfileSelector';
import { SavedAnalyses } from './components/SavedAnalyses';
import { SaveAnalysisModal } from './components/SaveAnalysisModal';
import { Sparkles } from 'lucide-react';
import { useTimezone } from './data/symbols';


const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

function App() {
  const [symbol, setSymbol] = useState<string>('');
  const [timeframe, setTimeframe] = useState<Timeframe>('روزانه');
  const [riskProfile, setRiskProfile] = useState<RiskProfile>('متعادل');
  const [timezone, setTimezone] = useTimezone();
  
  const { archivedFiles, addFilesToArchive, removeFileFromArchive, isInitialized: isFileArchiveInitialized } = useFileStore();
  const { history, addAnalysisToHistory, removeAnalysisFromHistory, isInitialized: isHistoryInitialized } = useAnalysisHistory();
  const { savedAnalyses, addSavedAnalysis, removeSavedAnalysis, isInitialized: isSavedAnalysesInitialized } = useSavedAnalyses();
  
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
  const [isFileUploadEnabled, setIsFileUploadEnabled] = useState<boolean>(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // States for viewing and saving
  const [viewingHistoryRecordId, setViewingHistoryRecordId] = useState<number | null>(null);
  const [viewingSavedRecordId, setViewingSavedRecordId] = useState<number | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isCurrentAnalysisSaved, setIsCurrentAnalysisSaved] = useState(false);

  // States for Chat
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [chatSuggestions, setChatSuggestions] = useState<string[]>([]);

  // State for Knowledge Context
  const [knowledgeContextForDisplay, setKnowledgeContextForDisplay] = useState<string>('');

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
        } catch (error) {
            console.error("Failed to save knowledge items to DB", error);
        }
    }
  };
  
  const generateChatSuggestions = (analysis: AnalysisResult): string[] => {
    const suggestions: string[] = [];
    
    if (analysis.riskLevel === 'بالا') {
        suggestions.push('دلایل اصلی بالا بودن سطح ریسک چیست؟');
    } else if (analysis.riskLevel === 'پایین') {
        suggestions.push('چه عواملی باعث شده ریسک این تحلیل پایین باشد؟');
    }

    if (analysis.patterns?.length > 0) {
        const mainPattern = analysis.patterns[0];
        suggestions.push(`الگوی "${mainPattern.name}" را بیشتر توضیح بده.`);
    }

    if (analysis.signal?.includes('خرید')) {
        suggestions.push('بهترین استراتژی برای ورود به معامله چیست؟');
    } else if (analysis.signal?.includes('فروش')) {
        suggestions.push('آیا نشانه‌ای از برگشت روند وجود دارد؟');
    }

    if (analysis.newsSummary && analysis.newsSummary !== 'هیچ خبر قابل توجهی یافت نشد.') {
        suggestions.push('جزئیات بیشتری در مورد اخبار اخیر ارائه بده.');
    }

    if (suggestions.length < 2) {
        suggestions.push('نقاط حمایت و مقاومت کلیدی کدامند؟');
    }
    
    return [...new Set(suggestions)].slice(0, 3);
  };


  const handleAnalysis = useCallback(async () => {
    if (!symbol) {
      setError('لطفاً نام نماد یا بازار مالی را وارد کنید.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setAnalysisData(null);
    setViewingHistoryRecordId(null);
    setViewingSavedRecordId(null);
    setIsCurrentAnalysisSaved(false);
    setChatSession(null);
    setChatMessages([]);
    setKnowledgeContextForDisplay('');
    setChatSuggestions([]);

    try {
      const knowledgeItems = await getKnowledgeForContextFromDB(symbol, timeframe, 5);
      const knowledgeContext = knowledgeItems.map(item =>
        ` - نوع: ${item.type}, تاریخ: ${new Date(item.timestamp).toLocaleDateString('fa-IR')}\n   محتوا: ${item.content}`
      ).join('\n\n');
      setKnowledgeContextForDisplay(knowledgeContext);
        
      const { analysis, sources, prompt } = await getFinancialAnalysis(symbol, timeframe, riskProfile, selectedFiles, knowledgeContext, timezone);
      
      const resultData = { analysis, sources };
      setAnalysisData(resultData);

      const newRecordId = await addAnalysisToHistory({
          symbol,
          timeframe,
          analysis,
          sources,
          timestamp: Date.now(),
          filesUsed: selectedFiles
      });

      if (newRecordId) {
          await saveKnowledgeFromAnalysis(analysis, newRecordId);
      }
      
      const suggestions = generateChatSuggestions(analysis);
      setChatSuggestions(suggestions);

      const historyForChat = [
        { role: 'user' as const, parts: [{ text: prompt }] },
        { role: 'model' as const, parts: [{ text: JSON.stringify(analysis, null, 2) }] }
      ];

      const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        history: historyForChat,
        config: {
          systemInstruction: 'You are a helpful financial analyst assistant. You answer questions based on the previous analysis provided in the history. Keep your answers concise and focused on the user\'s question. Your answers must be in Persian.',
        }
      });
      setChatSession(chat);
      setChatMessages([{
        role: 'model',
        parts: [{ text: 'تحلیل اولیه کامل شد. اگر سوالی در مورد این تحلیل دارید، لطفاً بپرسید.' }],
        timestamp: Date.now()
      }]);

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'خطایی در تحلیل رخ داد. لطفاً دوباره تلاش کنید یا ورودی خود را بررسی کنید.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, timeframe, riskProfile, selectedFiles, addAnalysisToHistory, timezone]);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!chatSession || isChatLoading) return;
    setChatSuggestions([]);
    
    // --- Action-Based Chat Logic ---
    const riskProfilePattern = new RegExp(`تحلیل را با پروفایل ریسک (${riskProfiles.join('|')}) دوباره انجام بده`);
    const timeframePattern = new RegExp(`تحلیل را برای تایم فریم (${timeframes.join('|')}) دوباره انجام بده`);

    const riskMatch = message.match(riskProfilePattern);
    const timeMatch = message.match(timeframePattern);

    if (riskMatch && riskMatch[1]) {
        const newRiskProfile = riskMatch[1] as RiskProfile;
        setRiskProfile(newRiskProfile);
        setChatMessages(prev => [...prev, 
            { role: 'user', parts: [{ text: message }], timestamp: Date.now() }, 
            { role: 'model', parts: [{ text: `باشه، در حال اجرای مجدد تحلیل با پروفایل ریسک '${newRiskProfile}' هستم...` }], timestamp: Date.now() + 1 }
        ]);
        setTimeout(() => handleAnalysis(), 100);
        return;
    }

    if (timeMatch && timeMatch[1]) {
        const newTimeframe = timeMatch[1] as Timeframe;
        setTimeframe(newTimeframe);
        setChatMessages(prev => [...prev, 
            { role: 'user', parts: [{ text: message }], timestamp: Date.now() }, 
            { role: 'model', parts: [{ text: `باشه، در حال اجرای مجدد تحلیل برای تایم فریم '${newTimeframe}' هستم...` }], timestamp: Date.now() + 1 }
        ]);
        setTimeout(() => handleAnalysis(), 100);
        return;
    }
    // --- End of Action-Based Chat Logic ---

    setIsChatLoading(true);
    const userMessage: ChatMessage = { role: 'user', parts: [{ text: message }], timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMessage, { role: 'model', parts: [{ text: '' }], timestamp: Date.now() + 1 }]);
    
    try {
      const stream = await chatSession.sendMessageStream({ message });
      let fullResponse = '';
      for await (const chunk of stream) {
        fullResponse += chunk.text;
        setChatMessages(prev => {
            const updated = [...prev];
            if (updated.length > 0) updated[updated.length - 1].parts[0].text = fullResponse;
            return updated;
        });
      }
    } catch (err) {
      console.error("Chat error:", err);
      const errorMessagePart = { text: 'متاسفانه در پردازش درخواست شما خطایی رخ داد.' };
      setChatMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0) updated[updated.length - 1].parts[0] = errorMessagePart;
          return updated;
      });
    } finally {
      setIsChatLoading(false);
    }
  }, [chatSession, isChatLoading, handleAnalysis, setRiskProfile, setTimeframe]);
  
  const resetView = () => {
        setIsLoading(false);
        setError(null);
        setChatSession(null);
        setChatMessages([]);
        setChatSuggestions([]);
        setKnowledgeContextForDisplay('');
  }

  const handleViewHistory = useCallback((id: number) => {
    const record = history.find(h => h.id === id);
    if (record) {
        resetView();
        setAnalysisData({ analysis: record.analysis, sources: record.sources });
        setSelectedFiles(record.filesUsed);
        setSymbol(record.symbol);
        setTimeframe(record.timeframe || 'روزانه');
        setViewingHistoryRecordId(id);
        setViewingSavedRecordId(null);
        setIsCurrentAnalysisSaved(false); // History items are not "saved" in the user's personal list
        const dashboard = document.querySelector('.analysis-dashboard-container');
        dashboard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [history]);

  const handleDeleteHistory = useCallback(async (id: number) => {
    await removeAnalysisFromHistory(id);
    if (viewingHistoryRecordId === id) {
        setAnalysisData(null);
        setViewingHistoryRecordId(null);
    }
  }, [removeAnalysisFromHistory, viewingHistoryRecordId]);

  const handleOpenSaveModal = useCallback(() => {
    if (analysisData) {
      setIsSaveModalOpen(true);
    }
  }, [analysisData]);

  const handleSaveAnalysis = useCallback(async (name: string) => {
    if (!analysisData) return;

    const newSavedRecord: Omit<SavedAnalysisRecord, 'id'> = {
      name,
      timestamp: Date.now(),
      symbol: analysisData.analysis.symbol,
      timeframe: analysisData.analysis.timeframe,
      filesUsed: selectedFiles,
      analysis: analysisData.analysis,
      sources: analysisData.sources,
    };
    
    await addSavedAnalysis(newSavedRecord);
    setIsCurrentAnalysisSaved(true);
    setIsSaveModalOpen(false);
  }, [analysisData, selectedFiles, addSavedAnalysis]);

  const handleLoadSavedAnalysis = useCallback((id: number) => {
    const record = savedAnalyses.find(r => r.id === id);
    if (record) {
      resetView();
      setAnalysisData({ analysis: record.analysis, sources: record.sources });
      setSelectedFiles(record.filesUsed);
      setSymbol(record.symbol);
      setTimeframe(record.timeframe || 'روزانه');
      setViewingSavedRecordId(id);
      setViewingHistoryRecordId(null);
      setIsCurrentAnalysisSaved(true); // A loaded saved analysis is already saved
      const dashboard = document.querySelector('.analysis-dashboard-container');
      dashboard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [savedAnalyses]);

  const handleDeleteSavedAnalysis = useCallback(async (id: number) => {
    await removeSavedAnalysis(id);
    if (viewingSavedRecordId === id) {
      setAnalysisData(null);
      setViewingSavedRecordId(null);
    }
  }, [removeSavedAnalysis, viewingSavedRecordId]);
  
  let viewingBannerInfo: { type: 'history' | 'saved', record: AnalysisRecord | SavedAnalysisRecord } | null = null;
  if (viewingHistoryRecordId) {
      const record = history.find(h => h.id === viewingHistoryRecordId);
      if (record) viewingBannerInfo = { type: 'history', record };
  } else if (viewingSavedRecordId) {
      const record = savedAnalyses.find(s => s.id === viewingSavedRecordId);
      if (record) viewingBannerInfo = { type: 'saved', record };
  }


  return (
    <Layout timezone={timezone} setTimezone={setTimezone}>
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-emerald-400">
            تحلیلگر هوشمند مالی Plus
          </h1>
          <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
             داده‌های بازار را وارد کنید تا هوش مصنوعی ما با قدرت Gemini، تحلیل جامع و پیش‌بینی دقیقی ارائه دهد.
          </p>
        </div>

        <div className="max-w-4xl mx-auto bg-gray-900/30 backdrop-blur-xl rounded-2xl shadow-2xl shadow-sky-900/20 p-6 md:p-8 border border-gray-700/50 animate-slide-in-up">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="md:col-span-2">
              <SymbolInput symbol={symbol} setSymbol={setSymbol} />
            </div>
            <TimeframeSelector timeframe={timeframe} setTimeframe={setTimeframe} />
            <RiskProfileSelector riskProfile={riskProfile} setRiskProfile={setRiskProfile} />
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
              className="group relative inline-flex items-center justify-center w-full md:w-auto px-12 py-3 text-lg font-bold text-white bg-gradient-to-r from-sky-500 to-emerald-600 rounded-lg shadow-lg hover:shadow-sky-500/40 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
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
          <SavedAnalyses
            analyses={savedAnalyses}
            isInitialized={isSavedAnalysesInitialized}
            onLoad={handleLoadSavedAnalysis}
            onDelete={handleDeleteSavedAnalysis}
            activeId={viewingSavedRecordId}
            timezone={timezone}
          />

          <AnalysisHistory
              history={history}
              isInitialized={isHistoryInitialized}
              onView={handleViewHistory}
              onDelete={handleDeleteHistory}
              activeId={viewingHistoryRecordId}
              timezone={timezone}
          />
        </div>

        {isLoading && <Loader />}
        
        {error && (
          <div className="max-w-4xl mx-auto mt-8 p-4 text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg animate-fade-in">
            <p>{error}</p>
          </div>
        )}

        {analysisData && !isLoading && (
          <div className="mt-12 analysis-dashboard-container">
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
              timezone={timezone}
              chatSuggestions={chatSuggestions}
            />
          </div>
        )}

        <SaveAnalysisModal 
            isOpen={isSaveModalOpen}
            onClose={() => setIsSaveModalOpen(false)}
            onSave={handleSaveAnalysis}
            defaultName={`${analysisData?.analysis.symbol || ''} - ${analysisData?.analysis.timeframe || ''}`}
        />

      </div>
    </Layout>
  );
}

export default App;
