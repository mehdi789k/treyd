import { useState, useEffect, useCallback } from 'react';
import type { UploadedFile, AnalysisRecord } from '../types';
import { getFilesFromDB, addFilesToDB, removeFileFromDB, addAnalysisToDB, getAllAnalysesFromDB, removeAnalysisFromDB as removeAnalysisFromDBService } from '../services/db';

export const useFileStore = () => {
    const [archivedFiles, setArchivedFiles] = useState<UploadedFile[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const loadFiles = async () => {
            try {
                const storedFiles = await getFilesFromDB();
                setArchivedFiles(storedFiles);
            } catch (error) {
                console.error("Failed to load files from DB", error);
            } finally {
                setIsInitialized(true);
            }
        };
        loadFiles();
    }, []);

    const addFilesToArchive = useCallback(async (newFiles: UploadedFile[]) => {
        try {
            await addFilesToDB(newFiles);
            const allFiles = await getFilesFromDB();
            setArchivedFiles(allFiles);
        } catch (error) {
            console.error("Failed to add files to DB", error);
            throw error; // Re-throw to allow component-level error handling
        }
    }, []);

    const removeFileFromArchive = useCallback(async (fileName: string) => {
        try {
            await removeFileFromDB(fileName);
            setArchivedFiles(prevFiles => prevFiles.filter(f => f.name !== fileName));
        } catch (error) {
            console.error("Failed to remove file from DB", error);
        }
    }, []);

    return { archivedFiles, addFilesToArchive, removeFileFromArchive, isInitialized };
};

export const useAnalysisHistory = () => {
    const [history, setHistory] = useState<AnalysisRecord[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    const loadHistory = useCallback(async () => {
        try {
            const storedHistory = await getAllAnalysesFromDB();
            setHistory(storedHistory);
        } catch (error) {
            console.error("Failed to load analysis history from DB", error);
        } finally {
            setIsInitialized(true);
        }
    }, []);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const addAnalysisToHistory = useCallback(async (record: Omit<AnalysisRecord, 'id'>): Promise<number | undefined> => {
        try {
            const newId = await addAnalysisToDB(record);
            await loadHistory(); // Reload to get the new record with its ID and sorted
            return newId;
        } catch (error) {
            console.error("Failed to add analysis to DB", error);
            return undefined;
        }
    }, [loadHistory]);

    const removeAnalysisFromHistory = useCallback(async (id: number) => {
        try {
            await removeAnalysisFromDBService(id);
            setHistory(prevHistory => prevHistory.filter(r => r.id !== id));
        } catch (error) {
            console.error("Failed to remove analysis from DB", error);
        }
    }, []);

    return { history, addAnalysisToHistory, removeAnalysisFromHistory, isInitialized };
};