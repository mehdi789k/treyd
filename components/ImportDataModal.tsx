import React, { useState, useMemo, useEffect } from 'react';
import { X, CheckSquare, Square, AlertTriangle, FileUp, Database, History, Save, Star, BrainCircuit, Settings } from 'lucide-react';

interface ImportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (selections: Record<string, boolean>) => void;
  backupData: any;
  error: string | null;
}

const CATEGORY_MAP: Record<string, { label: string, icon: React.ElementType, description: string }> = {
    history: { label: 'تاریخچه تحلیل‌ها', icon: History, description: 'تمام رکوردهای تحلیل‌های گذشته شما.' },
    savedAnalyses: { label: 'تحلیل‌های ذخیره شده', icon: Save, description: 'تحلیل‌هایی که به صورت دستی ذخیره کرده‌اید.' },
    archivedFiles: { label: 'آرشیو فایل‌ها', icon: Database, description: 'فایل‌های آپلود شده برای تحلیل.' },
    watchlist: { label: 'واچ‌لیست', icon: Star, description: 'لیست نمادهای مورد علاقه شما.' },
    knowledgeItems: { label: 'دانش AI', icon: BrainCircuit, description: 'آموخته‌های AI از تحلیل‌های پیشین.' },
    preferences: { label: 'تنظیمات کاربر', icon: Settings, description: 'تنظیمات شما مانند تایم‌فریم و پروفایل ریسک.' },
};

export const ImportDataModal: React.FC<ImportDataModalProps> = ({ isOpen, onClose, onImport, backupData, error }) => {
    const [selections, setSelections] = useState<Record<string, boolean>>({});

    const availableCategories = useMemo(() => {
        if (!backupData) return [];
        return Object.keys(CATEGORY_MAP).filter(key => backupData[key] !== undefined && Array.isArray(backupData[key]) ? backupData[key].length > 0 : backupData[key]);
    }, [backupData]);
    
    useEffect(() => {
        // Pre-select all available categories when modal opens
        const initialSelections: Record<string, boolean> = {};
        availableCategories.forEach(key => {
            initialSelections[key] = true;
        });
        setSelections(initialSelections);
    }, [availableCategories]);

    const handleToggleSelection = (key: string) => {
        setSelections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleImport = () => {
        if (Object.values(selections).some(v => v)) {
            onImport(selections);
        }
    };
    
    const isImportDisabled = !Object.values(selections).some(v => v);

    if (!isOpen) {
        return null;
    }

    return (
        <div 
            className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700 w-full max-w-2xl p-6 m-4 animate-slide-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-sky-300 flex items-center gap-2">
                        <FileUp />
                        وارد کردن داده از فایل پشتیبان
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white">
                        <X size={24} />
                    </button>
                </div>
                
                {error && (
                    <div className="p-3 bg-red-900/40 border border-red-700 text-red-300 rounded-lg flex items-center gap-3 mb-4">
                        <AlertTriangle />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {backupData && !error && (
                    <>
                        <p className="text-sm text-gray-400 mb-4">
                           دسته‌بندی‌های داده موجود در فایل پشتیبان شناسایی شد. مواردی را که می‌خواهید وارد شوند، انتخاب کنید. داده‌های موجود برای دسته‌بندی‌های انتخاب شده، <strong className="text-amber-300">جایگزین</strong> خواهند شد.
                        </p>
                        <div className="space-y-3 max-h-80 overflow-y-auto p-1">
                            {availableCategories.map(key => {
                                const { label, icon: Icon, description } = CATEGORY_MAP[key];
                                const count = Array.isArray(backupData[key]) ? backupData[key].length : 1;
                                const isSelected = selections[key];

                                return (
                                    <div 
                                        key={key} 
                                        onClick={() => handleToggleSelection(key)}
                                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'bg-sky-900/50 border-sky-700' : 'bg-gray-900/30 border-gray-700 hover:bg-gray-800/50'}`}
                                    >
                                        <div className="mr-4">
                                            {isSelected ? <CheckSquare className="w-6 h-6 text-sky-400" /> : <Square className="w-6 h-6 text-gray-500" />}
                                        </div>
                                        <Icon className="w-6 h-6 text-gray-300 mr-4" />
                                        <div className="flex-grow">
                                            <p className="font-semibold text-gray-200">{label} ({count} مورد)</p>
                                            <p className="text-xs text-gray-400">{description}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}

                <div className="mt-6 flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-sm font-semibold text-gray-300 bg-gray-700/50 rounded-lg hover:bg-gray-600/50 border border-gray-600 transition"
                    >
                        انصراف
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={!backupData || isImportDisabled}
                        className="px-6 py-2 text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-emerald-600 rounded-lg shadow-lg hover:from-sky-600 hover:to-emerald-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <FileUp size={18} />
                        وارد کردن موارد انتخابی
                    </button>
                </div>
            </div>
        </div>
    );
};
