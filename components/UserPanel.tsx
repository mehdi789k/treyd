import React, { useState, useRef } from 'react';
import { X, FileDown, Trash2, History, Save, FolderArchive, Star, Loader2, Zap, BrainCircuit, ShieldCheck, Edit, Check, EyeOff, FileUp } from 'lucide-react';
import type { KnowledgeItem } from '../types';

interface UserPanelProps {
  isOpen: boolean;
  onClose: () => void;
  stats: {
    historyCount: number;
    savedCount: number;
    filesCount: number;
    watchlistCount: number;
  };
  onExportAllData: () => void;
  onDeleteAllData: () => Promise<void>;
  onStartTour: () => void;
  knowledgeItems: KnowledgeItem[];
  onUpdateKnowledgeItem: (item: KnowledgeItem) => Promise<void>;
  onDeleteKnowledgeItem: (id: number) => Promise<void>;
  onImportFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

type Tab = 'actions' | 'knowledge' | 'policy';

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: number, color: string }> = ({ icon, label, value, color }) => (
    <div className={`flex items-center p-4 bg-gray-800/50 rounded-lg border ${color}`}>
        <div className="mr-4">{icon}</div>
        <div>
            <div className="text-2xl font-bold text-gray-100">{value}</div>
            <div className="text-sm text-gray-400">{label}</div>
        </div>
    </div>
);

const KnowledgeEditor: React.FC<{ 
    item: KnowledgeItem;
    onUpdate: (item: KnowledgeItem) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
}> = ({ item, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(item.content);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onUpdate({ ...item, content });
            setIsEditing(false);
        } catch (e) {
            console.error("Failed to save knowledge item:", e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-4 bg-gray-900/40 rounded-lg border border-gray-700/60 text-sm">
            <div className="flex justify-between items-start gap-4">
                <div className="flex-grow">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <span>{item.symbol}</span>
                        <span>|</span>
                        <span>{item.timeframe}</span>
                        <span>|</span>
                         <span className="font-semibold text-purple-400">{item.type}</span>
                    </div>
                    {isEditing ? (
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full bg-gray-900/80 border border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[100px]"
                        />
                    ) : (
                        <p className="text-gray-300 whitespace-pre-line">{item.content}</p>
                    )}
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                    {isEditing ? (
                         <button onClick={handleSave} disabled={isSaving} className="p-2 rounded-full text-gray-300 bg-emerald-700/80 hover:bg-emerald-600 transition-colors">
                            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                        </button>
                    ) : (
                         <button onClick={() => setIsEditing(true)} className="p-2 rounded-full text-gray-300 hover:bg-sky-700 hover:text-white transition-colors">
                            <Edit className="h-5 w-5" />
                        </button>
                    )}
                     <button onClick={() => onDelete(item.id!)} className="p-2 rounded-full text-gray-400 hover:bg-red-800 hover:text-red-300 transition-colors">
                        <Trash2 className="h-5 w-5" />
                    </button>
                </div>
            </div>
             {isEditing && (
                <button onClick={() => { setIsEditing(false); setContent(item.content); }} className="text-xs text-gray-400 hover:text-white mt-2">
                    لغو
                </button>
            )}
        </div>
    );
};

export const UserPanel: React.FC<UserPanelProps> = ({ isOpen, onClose, stats, onExportAllData, onDeleteAllData, onStartTour, knowledgeItems, onUpdateKnowledgeItem, onDeleteKnowledgeItem, onImportFileSelect }) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('actions');
    const importInputRef = useRef<HTMLInputElement>(null);

    const handleDelete = () => {
        const confirmed = window.confirm(
          'آیا مطمئن هستید؟ با این کار تمام تاریخچه، تحلیل‌های ذخیره شده، فایل‌های آرشیو و واچ‌لیست شما برای همیشه حذف خواهند شد. این عمل غیرقابل بازگشت است.'
        );
        if (confirmed) {
          setIsDeleting(true);
          onDeleteAllData().finally(() => {
            setIsDeleting(false);
            onClose();
          });
        }
    };
    
    const handleStartTourClick = () => {
        onClose();
        setTimeout(onStartTour, 150);
    };

    if (!isOpen) return null;

    const TabButton = ({ tab, label, icon }: { tab: Tab, label: string, icon: React.ReactNode }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
                activeTab === tab 
                ? 'text-sky-300 border-sky-400' 
                : 'text-gray-400 border-transparent hover:text-white hover:bg-gray-700/50'
            }`}
        >
            {icon} {label}
        </button>
    );

    const renderContent = () => {
        switch(activeTab) {
            case 'knowledge':
                return (
                    <div className="animate-fade-in space-y-4">
                        <h3 className="text-lg font-semibold text-gray-200">مدیریت دانش آموخته‌شده AI</h3>
                        <p className="text-sm text-gray-400">
                            در این بخش می‌توانید آموخته‌های هوش مصنوعی که از تحلیل‌های شما استخراج شده را مدیریت کنید. ویرایش یا حذف این موارد، بر تحلیل‌های آینده تاثیر خواهد گذاشت.
                        </p>
                        <div className="max-h-[400px] overflow-y-auto space-y-3 p-2 bg-black/20 rounded-lg">
                            {knowledgeItems.length > 0 ? (
                                knowledgeItems.map(item => <KnowledgeEditor key={item.id} item={item} onUpdate={onUpdateKnowledgeItem} onDelete={onDeleteKnowledgeItem} />)
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <BrainCircuit size={40} className="mx-auto" />
                                    <p className="mt-2">دانش آموخته‌ای وجود ندارد.</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'policy':
                return (
                     <div className="animate-fade-in space-y-4">
                        <h3 className="text-lg font-semibold text-gray-200">حریم خصوصی و داده‌های شما</h3>
                        <div className="space-y-3 text-sm text-gray-300 leading-relaxed p-4 bg-gray-900/40 rounded-lg border border-gray-700/60">
                            <p>
                                <strong>ما به حریم خصوصی شما احترام می‌گذاریم.</strong> این برنامه با اولویت امنیت و کنترل کاربر طراحی شده است.
                            </p>
                            <p className="flex items-start gap-3">
                                <ShieldCheck className="w-8 h-5 text-emerald-400 mt-1 flex-shrink-0" />
                                <span>
                                    <strong>ذخیره‌سازی محلی:</strong> تمام داده‌های شما، شامل تاریخچه تحلیل‌ها، تحلیل‌های ذخیره شده، فایل‌های آپلود شده و واچ‌لیست، به صورت ایمن <strong className="text-emerald-300">فقط در مرورگر شما</strong> (توسط IndexedDB) ذخیره می‌شوند.
                                </span>
                            </p>
                            <p className="flex items-start gap-3">
                                <EyeOff className="w-8 h-5 text-red-400 mt-1 flex-shrink-0" />
                                 <span>
                                    <strong>عدم ارسال به سرور:</strong> هیچ‌کدام از داده‌های شخصی و ذخیره شده شما به سرورهای ما یا هیچ سرور خارجی دیگری ارسال <strong className="text-red-300">نمی‌شود</strong>.
                                </span>
                            </p>
                            <p className="flex items-start gap-3">
                                <Zap className="w-8 h-5 text-sky-400 mt-1 flex-shrink-0" />
                                 <span>
                                    <strong>ارتباط با AI:</strong> برای انجام تحلیل، فقط اطلاعات ضروری (مانند نام نماد، تایم‌فریم و محتوای فایل‌های انتخابی) به صورت امن به API گوگل Gemini ارسال می‌شود. این ارتباط رمزنگاری شده است و تاریخچه چت‌های شما به سرور ما ارسال نمی‌گردد.
                                </span>
                            </p>
                            <p>
                                شما کنترل کامل بر داده‌های خود دارید و هر زمان که بخواهید می‌توانید از طریق همین پنل، تمام اطلاعات را حذف کنید.
                            </p>
                        </div>
                    </div>
                );
            case 'actions':
            default:
                return (
                     <div className="animate-fade-in">
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-200 mb-4">آمار کلی</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <StatCard icon={<History size={32} className="text-sky-400"/>} label="تحلیل در تاریخچه" value={stats.historyCount} color="border-sky-700/50" />
                                <StatCard icon={<Save size={32} className="text-amber-400"/>} label="تحلیل ذخیره شده" value={stats.savedCount} color="border-amber-700/50" />
                                <StatCard icon={<FolderArchive size={32} className="text-emerald-400"/>} label="فایل در آرشیو" value={stats.filesCount} color="border-emerald-700/50" />
                                <StatCard icon={<Star size={32} className="text-yellow-400"/>} label="نماد در واچ‌لیست" value={stats.watchlistCount} color="border-yellow-700/50" />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-gray-200 mb-4">ابزارها و اقدامات</h3>
                            <div className="space-y-4">
                                <div className="p-4 bg-gray-900/30 rounded-lg border border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div>
                                        <h4 className="font-semibold text-gray-200">راهنمای شروع به کار</h4>
                                        <p className="text-xs text-gray-500 mt-1">آیا با برنامه آشنایی ندارید؟ راهنمای ما را دنبال کنید.</p>
                                    </div>
                                    <button
                                        onClick={handleStartTourClick}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border transition-all duration-300 transform hover:scale-105 bg-sky-800/30 border-sky-700/60 text-sky-300 hover:bg-sky-700/50 hover:border-sky-600 w-full md:w-auto flex-shrink-0 justify-center"
                                    >
                                        <Zap size={18} />
                                        شروع راهنما
                                    </button>
                                </div>
                                <div className="p-4 bg-gray-900/30 rounded-lg border border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div>
                                        <h4 className="font-semibold text-gray-200">پشتیبان‌گیری و بازیابی داده</h4>
                                        <p className="text-xs text-gray-500 mt-1">از داده‌های خود فایل پشتیبان تهیه کنید یا داده‌ها را از یک فایل بازیابی نمایید.</p>
                                    </div>
                                    <div className="flex gap-2 w-full md:w-auto flex-shrink-0">
                                        <input type="file" ref={importInputRef} onChange={onImportFileSelect} className="hidden" accept=".json" />
                                        <button
                                            onClick={() => importInputRef.current?.click()}
                                            className="flex-1 flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border transition-all duration-300 transform hover:scale-105 bg-sky-800/30 border-sky-700/60 text-sky-300 hover:bg-sky-700/50 hover:border-sky-600 justify-center"
                                        >
                                            <FileUp size={18} />
                                            وارد کردن
                                        </button>
                                        <button
                                            onClick={onExportAllData}
                                            className="flex-1 flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border transition-all duration-300 transform hover:scale-105 bg-emerald-800/30 border-emerald-700/60 text-emerald-300 hover:bg-emerald-700/50 hover:border-emerald-600 justify-center"
                                        >
                                            <FileDown size={18} />
                                            خروجی
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4 bg-red-900/20 rounded-lg border border-red-700/50 flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div>
                                        <h4 className="font-semibold text-red-300">حذف تمام داده‌ها (غیرقابل بازگشت)</h4>
                                        <p className="text-xs text-red-400/80 mt-1">تمام اطلاعات شما از جمله تاریخچه، موارد ذخیره شده، فایل‌ها و واچ‌لیست برای همیشه پاک می‌شود.</p>
                                    </div>
                                    <button
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border transition-all duration-300 transform hover:scale-105 bg-red-800/30 border-red-700/60 text-red-300 hover:bg-red-700/50 hover:border-red-600 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto flex-shrink-0 justify-center"
                                    >
                                        {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                        {isDeleting ? 'در حال حذف...' : 'حذف همه چیز'}
                                    </button>
                                </div>
                            </div>
                        </div>
                     </div>
                );
        }
    }


    return (
        <div 
            className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex justify-center items-start z-[60] animate-fade-in overflow-y-auto"
            onClick={onClose}
        >
            <div 
                className="bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700 w-full max-w-3xl p-6 my-8 animate-slide-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4 border-b border-gray-700/70 pb-4">
                    <h2 className="text-2xl font-bold text-sky-300">پنل کاربری</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="flex items-center border-b border-gray-700/70 mb-6">
                    <TabButton tab="actions" label="آمار و ابزارها" icon={<Zap size={16}/>} />
                    <TabButton tab="knowledge" label="دانش AI" icon={<BrainCircuit size={16}/>} />
                    <TabButton tab="policy" label="سیاست داده‌ها" icon={<ShieldCheck size={16}/>} />
                </div>

                <div className="min-h-[400px]">
                    {renderContent()}
                </div>

            </div>
        </div>
    );
};