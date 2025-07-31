
import React, { useCallback, useState, useMemo } from 'react';
import type { UploadedFile, FileCategory } from '../types';
import { FileCategories } from '../types';
import { categorizeFileContent } from '../services/geminiService';
import { 
    UploadCloud, 
    FileText, 
    Power, 
    Trash2, 
    Square, 
    CheckSquare, 
    Loader2, 
    ChevronDown, 
    ChevronUp,
    Database,
    Lightbulb,
    Newspaper,
    ClipboardList,
    File as FileIcon,
    AlertCircle,
    Image as ImageIcon
} from 'lucide-react';

interface FileUploadProps {
  archivedFiles: UploadedFile[];
  selectedFiles: UploadedFile[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  addFilesToArchive: (newFiles: UploadedFile[]) => Promise<void>;
  removeFileFromArchive: (fileName: string) => Promise<void>;
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;
  isArchiveReady: boolean;
}

interface Notification {
  id: number;
  message: string;
  type: 'info' | 'error';
}

const categoryInfo: Record<FileCategory, { icon: React.ElementType, color: string }> = {
    'داده‌های بازار': { icon: Database, color: 'text-sky-400' },
    'استراتژی شخصی': { icon: Lightbulb, color: 'text-amber-400' },
    'اخبار و مقالات': { icon: Newspaper, color: 'text-emerald-400' },
    'گزارش‌های تحلیلی': { icon: ClipboardList, color: 'text-purple-400' },
    'تصویر چارت': { icon: ImageIcon, color: 'text-indigo-400' },
    'سایر': { icon: FileIcon, color: 'text-gray-400' }
};

const sha256 = async (text: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const FileUpload: React.FC<FileUploadProps> = ({
  archivedFiles,
  selectedFiles,
  setSelectedFiles,
  addFilesToArchive,
  removeFileFromArchive,
  isEnabled,
  setIsEnabled,
  isArchiveReady,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [openCategories, setOpenCategories] = useState<Record<FileCategory, boolean>>(() => {
    const state: any = {};
    FileCategories.forEach(c => state[c] = true);
    return state;
  });

  const addNotification = (message: string, type: 'info' | 'error' = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const filesToProcess = event.target.files;
    if (!filesToProcess || filesToProcess.length === 0) return;

    setIsProcessing(true);
    setProcessingStatus('شروع پردازش...');

    const existingHashMap = new Map<string, string>(archivedFiles.map(f => [f.contentHash, f.name]));
    const batchHashMap = new Map<string, string>();

    const filePromises = Array.from(filesToProcess).map(file => {
        return new Promise<UploadedFile | null>((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (readEvent) => {
                try {
                    const content = readEvent.target?.result as string;
                    if (!content) {
                      resolve(null);
                      return;
                    }

                    setProcessingStatus(`در حال هش‌کردن ${file.name}...`);
                    const contentHash = await sha256(content);

                    if (batchHashMap.has(contentHash)) {
                        addNotification(`فایل "${file.name}" محتوای تکراری با فایل "${batchHashMap.get(contentHash)}" در همین آپلود دارد و نادیده گرفته شد.`, 'info');
                        resolve(null);
                        return;
                    }
                    if (existingHashMap.has(contentHash)) {
                        addNotification(`محتوای فایل "${file.name}" با فایل موجود "${existingHashMap.get(contentHash)}" یکسان است و نادیده گرفته شد.`, 'info');
                        resolve(null);
                        return;
                    }
                    
                    batchHashMap.set(contentHash, file.name);

                    setProcessingStatus(`در حال دسته‌بندی ${file.name}...`);
                    const isImage = file.type.startsWith('image/');
                    const category = isImage ? 'تصویر چارت' : await categorizeFileContent(content);

                    resolve({
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        content: content,
                        contentHash: contentHash,
                        category: category,
                    });
                } catch (err) {
                    console.error('Error processing file:', file.name, err);
                    addNotification(`خطا در پردازش فایل ${file.name}.`, 'error');
                    resolve(null);
                }
            };
            
            reader.onerror = () => {
                console.error('Error reading file:', file.name);
                addNotification(`خطا در خواندن فایل ${file.name}.`, 'error');
                resolve(null);
            };

            if (file.type.startsWith('image/')) {
                reader.readAsDataURL(file);
            } else {
                reader.readAsText(file);
            }
        });
    });

    const results = await Promise.all(filePromises);
    const newFilesToAdd = results.filter((file): file is UploadedFile => file !== null);

    if (newFilesToAdd.length > 0) {
        setProcessingStatus('در حال ذخیره فایل‌ها در آرشیو...');
        try {
            await addFilesToArchive(newFilesToAdd);
            addNotification(`${newFilesToAdd.length} فایل جدید با موفقیت به آرشیو اضافه شد.`, 'info');
        } catch (error) {
            console.error("Error saving files:", error);
            addNotification(`خطا در ذخیره فایل‌ها. ممکن است محتوا تکراری باشد.`, 'error');
        }
    }
    
    setProcessingStatus('');
    setIsProcessing(false);
    if (event.target) {
        event.target.value = '';
    }
  }, [addFilesToArchive, archivedFiles]);


  const handleRemoveFile = async (fileName: string) => {
    await removeFileFromArchive(fileName);
    setSelectedFiles(prev => prev.filter(f => f.name !== fileName));
  };
  
  const handleToggle = () => setIsEnabled(!isEnabled);
  
  const handleFileSelectionToggle = (file: UploadedFile) => {
    setSelectedFiles(prevSelected => {
        const isSelected = prevSelected.some(f => f.name === file.name);
        if (isSelected) {
            return prevSelected.filter(f => f.name !== file.name);
        } else {
            return [...prevSelected, file];
        }
    });
  };

  const groupedFiles = useMemo(() => {
    const groups = {} as Record<FileCategory, UploadedFile[]>;
    FileCategories.forEach(cat => groups[cat] = []);
    archivedFiles.forEach(file => {
        const category = file.category || 'سایر';
        if (groups[category]) {
            groups[category].push(file);
        } else {
            groups['سایر'].push(file);
        }
    });
    return groups;
  }, [archivedFiles]);

  const renderFileArchive = () => {
    if (!isArchiveReady) {
      return (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <p className="mr-3 text-gray-400">بارگذاری آرشیو فایل...</p>
        </div>
      );
    }
    
    if (archivedFiles.length === 0) {
      return (
        <div className="text-center py-8">
            <FileText className="mx-auto h-10 w-10 text-gray-600" />
            <p className="mt-2 text-sm text-gray-500">آرشیو فایل شما خالی است.</p>
        </div>
      );
    }
    
    return (
        <div className="mt-4 space-y-2 max-h-72 overflow-y-auto pr-2">
            {FileCategories.map(category => {
                const files = groupedFiles[category];
                if (!files || files.length === 0) return null;
                
                const { icon: CategoryIcon, color } = categoryInfo[category] || categoryInfo['سایر'];
                const isOpen = openCategories[category];
                
                return (
                    <div key={category} className="animate-fade-in">
                        <button
                            onClick={() => setOpenCategories(prev => ({...prev, [category]: !prev[category]}))}
                            className="w-full flex items-center justify-between p-2 rounded-md bg-gray-700/20 hover:bg-gray-700/40 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <CategoryIcon className={`w-5 h-5 ${color}`} />
                                <span className={`font-semibold ${color}`}>{category}</span>
                                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{files.length}</span>
                            </div>
                            <ChevronUp className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
                            <div className="pl-4 pt-2 space-y-2">
                                {files.map(file => {
                                    const isSelected = selectedFiles.some(f => f.name === file.name);
                                    const { icon: FileTypeIcon, color: iconColor } = categoryInfo[file.category] || categoryInfo['سایر'];
                                    return (
                                        <div key={file.name} className="flex items-center justify-between bg-gray-700/30 p-2 rounded-md transition-colors hover:bg-gray-700/50">
                                          <div className="flex items-center space-x-3 space-x-reverse cursor-pointer grow overflow-hidden" onClick={() => handleFileSelectionToggle(file)}>
                                            <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                                                {isSelected ? <CheckSquare className="h-5 w-5 text-sky-400"/> : <Square className="h-5 w-5 text-gray-500" />}
                                            </div>
                                            <FileTypeIcon className={`h-5 w-5 ${iconColor} flex-shrink-0`}/>
                                            <span className="text-sm text-gray-300 truncate" title={file.name}>{file.name}</span>
                                          </div>
                                          <button onClick={() => handleRemoveFile(file.name)} className="text-gray-500 hover:text-red-400 p-1 rounded-full hover:bg-red-900/50 transition-colors flex-shrink-0 ml-2">
                                            <Trash2 className="h-4 w-4"/>
                                          </button>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
         <label className="block text-sm font-medium text-gray-300">
            آرشیو فایل هوشمند (اختیاری)
         </label>
         <div className="flex items-center gap-3">
             <button
                type="button"
                onClick={handleToggle}
                className={`${isEnabled ? 'bg-sky-500' : 'bg-gray-600'} relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-gray-900 shadow-inner`}
                role="switch"
                aria-checked={isEnabled}
            >
                <span
                    aria-hidden="true"
                    className={`${isEnabled ? 'translate-x-7' : 'translate-x-1'} pointer-events-none relative inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out`}
                >
                    <span className="absolute inset-0 flex h-full w-full items-center justify-center">
                        <Power className={`h-4 w-4 transition-colors duration-300 ${isEnabled ? 'text-sky-500' : 'text-gray-400'}`} />
                    </span>
                </span>
            </button>
         </div>
      </div>
       <p className="text-xs text-gray-500 mb-2">
            فایل‌های داده، استراتژی، تصاویر چارت یا تحلیل‌های شخصی را برای لحاظ کردن در تحلیل AI آپلود کنید.
        </p>
      
      {isEnabled ? (
        <div className="animate-fade-in bg-gray-900/50 p-4 rounded-lg border border-gray-700/50">
          <div className="fixed top-5 right-5 z-50 space-y-2">
              {notifications.map(n => (
                  <div key={n.id} className={`flex items-center gap-3 p-3 rounded-lg shadow-lg text-sm animate-fade-in ${n.type === 'info' ? 'bg-sky-800 text-sky-200' : 'bg-red-800 text-red-200'}`}>
                      <AlertCircle className="h-5 w-5" />
                      <span>{n.message}</span>
                  </div>
              ))}
          </div>
          <div className="flex justify-center border-2 border-gray-600/80 border-dashed rounded-lg bg-gray-800/20 hover:border-sky-500 transition-colors duration-300">
            <label
              htmlFor="file-upload"
              className="relative cursor-pointer w-full p-4 text-center"
            >
              <div className="space-y-1 text-center">
                {isProcessing ? <Loader2 className="mx-auto h-8 w-8 text-gray-500 animate-spin" /> : <UploadCloud className="mx-auto h-8 w-8 text-gray-500" />}
                 <div className="flex flex-col items-center">
                    <span className="font-medium text-sky-400 hover:text-sky-300 text-sm">
                        {isProcessing ? processingStatus : 'فایل‌ها را بکشید یا برای انتخاب کلیک کنید'}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                        می‌توانید چند فایل (متنی یا تصویری) را همزمان آپلود کنید.
                    </p>
                </div>
              </div>
              <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} accept=".csv,.txt,.json,.pdf,.xlsx,image/*" disabled={isProcessing} />
            </label>
          </div>
          {renderFileArchive()}
        </div>
      ) : (
        <div className="mt-1 flex items-center justify-center px-6 min-h-[140px] border-2 border-gray-700/50 border-dashed rounded-lg bg-gray-800/20">
          <p className="text-sm text-gray-500">آپلود فایل غیرفعال است.</p>
        </div>
      )}
    </div>
  );
};