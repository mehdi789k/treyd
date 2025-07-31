import type { UploadedFile, AnalysisRecord, KnowledgeItem, Timeframe, SavedAnalysisRecord } from '../types';

const DB_NAME = 'FinancialAnalystDB';
const DB_VERSION = 5;
const FILES_STORE_NAME = 'files';
const ANALYSIS_STORE_NAME = 'analyses';
const KNOWLEDGE_STORE_NAME = 'knowledge';
const SAVED_ANALYSIS_STORE_NAME = 'savedAnalyses';


let dbPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Error opening IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 2) {
          if (!dbInstance.objectStoreNames.contains(FILES_STORE_NAME)) {
            dbInstance.createObjectStore(FILES_STORE_NAME, { keyPath: 'name' });
          }
          if (!dbInstance.objectStoreNames.contains(ANALYSIS_STORE_NAME)) {
            dbInstance.createObjectStore(ANALYSIS_STORE_NAME, { keyPath: 'id', autoIncrement: true });
          }
      }
      
      if (oldVersion < 3) {
          const transaction = (event.target as IDBOpenDBRequest).transaction;
          if (transaction) {
            const fileStore = transaction.objectStore(FILES_STORE_NAME);
            if (!fileStore.indexNames.contains('by_hash')) {
                fileStore.createIndex('by_hash', 'contentHash', { unique: true });
            }
          }
      }
      
      if (oldVersion < 4) {
        if (!dbInstance.objectStoreNames.contains(KNOWLEDGE_STORE_NAME)) {
            const knowledgeStore = dbInstance.createObjectStore(KNOWLEDGE_STORE_NAME, { keyPath: 'id', autoIncrement: true });
            knowledgeStore.createIndex('by_symbol_timeframe', ['symbol', 'timeframe'], { unique: false });
            knowledgeStore.createIndex('by_type', 'type', { unique: false });
            knowledgeStore.createIndex('by_timestamp', 'timestamp', { unique: false });
            knowledgeStore.createIndex('by_source_id', 'sourceAnalysisId', { unique: false });
        }
      }
      
       if (oldVersion < 5) {
          if (!dbInstance.objectStoreNames.contains(SAVED_ANALYSIS_STORE_NAME)) {
            const savedStore = dbInstance.createObjectStore(SAVED_ANALYSIS_STORE_NAME, { keyPath: 'id', autoIncrement: true });
            savedStore.createIndex('by_timestamp', 'timestamp', { unique: false });
          }
      }
    };
  });
  return dbPromise;
};

// --- Files Store Functions ---

export const addFilesToDB = async (files: UploadedFile[]): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(FILES_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(FILES_STORE_NAME);

  // Wrap the transaction logic in a new promise to handle its completion events.
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(transaction.error);
    };

    // Add all files in a loop. If one fails, the transaction's onerror will be triggered,
    // causing the entire operation to fail atomically.
    files.forEach(file => {
      store.put(file);
    });
  });
};

export const getFilesFromDB = async (): Promise<UploadedFile[]> => {
  const db = await openDB();
  const transaction = db.transaction(FILES_STORE_NAME, 'readonly');
  const store = transaction.objectStore(FILES_STORE_NAME);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve((request.result as UploadedFile[]).sort((a,b) => a.name.localeCompare(b.name)));
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
};

export const removeFileFromDB = async (fileName: string): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction(FILES_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(FILES_STORE_NAME);
    
    return new Promise((resolve, reject) => {
        const request = store.delete(fileName);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};


// --- Analysis History Store Functions ---

export const addAnalysisToDB = async (record: Omit<AnalysisRecord, 'id'>): Promise<number> => {
    const db = await openDB();
    const transaction = db.transaction(ANALYSIS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(ANALYSIS_STORE_NAME);
    return new Promise((resolve, reject) => {
        const request = store.add(record);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const getAllAnalysesFromDB = async (): Promise<AnalysisRecord[]> => {
    const db = await openDB();
    const transaction = db.transaction(ANALYSIS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(ANALYSIS_STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            // Sort by timestamp descending to show newest first
            resolve((request.result as AnalysisRecord[]).sort((a, b) => b.timestamp - a.timestamp));
        };
        request.onerror = () => reject(request.error);
    });
};

export const removeAnalysisFromDB = async (id: number): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction([ANALYSIS_STORE_NAME, KNOWLEDGE_STORE_NAME], 'readwrite');
    const analysisStore = transaction.objectStore(ANALYSIS_STORE_NAME);
    const knowledgeStore = transaction.objectStore(KNOWLEDGE_STORE_NAME);
    const knowledgeIndex = knowledgeStore.index('by_source_id');

    return new Promise((resolve, reject) => {
        transaction.onerror = () => reject(transaction.error);
        transaction.oncomplete = () => resolve();

        // Step 1: Find all knowledge items associated with the analysis ID
        const getKnowledgeRequest = knowledgeIndex.getAll(id);
        getKnowledgeRequest.onsuccess = () => {
            const knowledgeItemsToDelete = getKnowledgeRequest.result as KnowledgeItem[];
            
            // Step 2: Delete each associated knowledge item
            knowledgeItemsToDelete.forEach(item => {
                if (item.id) {
                    knowledgeStore.delete(item.id);
                }
            });

            // Step 3: Delete the main analysis record
            analysisStore.delete(id);
        };
    });
};


// --- Knowledge Base Store Functions ---

export const addKnowledgeItemsToDB = async (items: Omit<KnowledgeItem, 'id'>[]): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction(KNOWLEDGE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(KNOWLEDGE_STORE_NAME);

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        items.forEach(item => store.add(item));
    });
};

export const getKnowledgeForContextFromDB = async (symbol: string, timeframe: Timeframe, limit: number): Promise<KnowledgeItem[]> => {
    const db = await openDB();
    const transaction = db.transaction(KNOWLEDGE_STORE_NAME, 'readonly');
    const store = transaction.objectStore(KNOWLEDGE_STORE_NAME);
    const index = store.index('by_symbol_timeframe');
    const request = index.getAll(IDBKeyRange.only([symbol, timeframe]));

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            const allItems = request.result as KnowledgeItem[];
            // Sort by timestamp descending to get the most recent ones
            const sortedItems = allItems.sort((a, b) => b.timestamp - a.timestamp);
            resolve(sortedItems.slice(0, limit));
        };
        request.onerror = () => {
            reject(request.error);
        };
    });
};

// --- Saved Analysis Store Functions ---

export const addSavedAnalysisToDB = async (record: Omit<SavedAnalysisRecord, 'id'>): Promise<number> => {
    const db = await openDB();
    const transaction = db.transaction(SAVED_ANALYSIS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(SAVED_ANALYSIS_STORE_NAME);
    return new Promise((resolve, reject) => {
        const request = store.add(record);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const getAllSavedAnalysesFromDB = async (): Promise<SavedAnalysisRecord[]> => {
    const db = await openDB();
    const transaction = db.transaction(SAVED_ANALYSIS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(SAVED_ANALYSIS_STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            resolve((request.result as SavedAnalysisRecord[]).sort((a, b) => b.timestamp - a.timestamp));
        };
        request.onerror = () => reject(request.error);
    });
};

export const removeSavedAnalysisFromDB = async (id: number): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction(SAVED_ANALYSIS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(SAVED_ANALYSIS_STORE_NAME);
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};