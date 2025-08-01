
import React from 'react';
import type { Strategy } from '../types';
import { strategies } from '../types';
import { Bot, Zap, Waves, Moon } from 'lucide-react';

interface StrategySelectorProps {
  selectedStrategies: Strategy[];
  setSelectedStrategies: (strategies: Strategy[]) => void;
}

const strategyOptions: { name: Strategy; icon: React.ElementType, description: string }[] = [
    { name: 'تحلیل تکنیکال کلاسیک', icon: Bot, description: 'استفاده از اندیکاتورهای متداول و الگوهای کلاسیک.' },
    { name: 'تحلیل بر اساس پرایس اکشن', icon: Zap, description: 'تمرکز بر حرکات قیمت و کندل‌ها بدون اندیکاتور.' },
    { name: 'تحلیل با امواج الیوت', icon: Waves, description: 'شناسایی امواج محرک و اصلاحی در روند قیمت.' },
    { name: 'تحلیل بر اساس آسترولوژی', icon: Moon, description: 'دیدگاه غیرمتعارف مبتنی بر رویدادهای نجومی.' },
];

export const StrategySelector: React.FC<StrategySelectorProps> = ({ selectedStrategies, setSelectedStrategies }) => {

  const handleToggleStrategy = (strategy: Strategy) => {
    const isSelected = selectedStrategies.includes(strategy);
    let newSelection;

    if (isSelected) {
        newSelection = selectedStrategies.filter(s => s !== strategy);
    } else {
        newSelection = [...selectedStrategies, strategy];
    }
    
    // Ensure at least one strategy is always selected
    if (newSelection.length > 0) {
        setSelectedStrategies(newSelection);
    }
  };

  return (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
            استراتژی‌های تحلیل (حداقل یک مورد)
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {strategyOptions.map((option) => {
                const isSelected = selectedStrategies.includes(option.name);
                return (
                    <button
                        key={option.name}
                        type="button"
                        onClick={() => handleToggleStrategy(option.name)}
                        className={`relative text-center p-3 rounded-lg transition-all duration-300 border-2
                            ${
                            isSelected
                                ? 'bg-sky-900/50 border-sky-600 shadow-lg'
                                : 'bg-gray-800/50 border-gray-700/80 hover:border-gray-600'
                        }`}
                        aria-pressed={isSelected}
                        title={option.description}
                    >
                        {isSelected && (
                            <div className="absolute top-2 left-2 w-5 h-5 bg-sky-500 rounded-full flex items-center justify-center">
                                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        )}
                        <div className="flex flex-col items-center justify-center h-full">
                            <option.icon className={`w-8 h-8 mb-2 transition-colors ${isSelected ? 'text-sky-300' : 'text-gray-500'}`} />
                            <span className={`text-xs sm:text-sm font-semibold ${isSelected ? 'text-white' : 'text-gray-300'}`}>{option.name}</span>
                        </div>
                    </button>
                );
            })}
        </div>
         <p className="mt-2 text-xs text-gray-500">می‌توانید چند استراتژی را برای تحلیل ترکیبی انتخاب کنید.</p>
    </div>
  );
};
