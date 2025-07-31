import { useState, useEffect, useCallback } from 'react';
import type { SavedAnalysisRecord } from '../types';
import { addSavedAnalysisToDB, getAllSavedAnalysesFromDB, removeSavedAnalysisFromDB as removeSavedAnalysisFromDBService } from '../services/db';

export const useSavedAnalyses = () => {
    const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysisRecord[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    const loadSavedAnalyses = useCallback(async () => {
        try {
            const storedRecords = await getAllSavedAnalysesFromDB();
            setSavedAnalyses(storedRecords);
        } catch (error) {
            console.error("Failed to load saved analyses from DB", error);
        } finally {
            setIsInitialized(true);
        }
    }, []);

    useEffect(() => {
        loadSavedAnalyses();
    }, [loadSavedAnalyses]);

    const addSavedAnalysis = useCallback(async (record: Omit<SavedAnalysisRecord, 'id'>): Promise<number | undefined> => {
        try {
            const newId = await addSavedAnalysisToDB(record);
            await loadSavedAnalyses(); // Reload to get the new record with its ID and sorted
            return newId;
        } catch (error) {
            console.error("Failed to add saved analysis to DB", error);
            return undefined;
        }
    }, [loadSavedAnalyses]);

    const removeSavedAnalysis = useCallback(async (id: number) => {
        try {
            await removeSavedAnalysisFromDBService(id);
            setSavedAnalyses(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            console.error("Failed to remove saved analysis from DB", error);
        }
    }, []);

    return { savedAnalyses, addSavedAnalysis, removeSavedAnalysis, isInitialized };
};
