
import React from 'react';
import { Sparkles } from 'lucide-react';

interface ChatSuggestionsProps {
    suggestions: string[];
    onSuggestionClick: (suggestion: string) => void;
}

export const ChatSuggestions: React.FC<ChatSuggestionsProps> = ({ suggestions, onSuggestionClick }) => {
    if (!suggestions || suggestions.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col items-start gap-2 animate-fade-in mt-4">
             <p className="text-xs text-gray-400 font-semibold mb-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                پیشنهادها:
            </p>
            <div className="flex flex-wrap gap-2">
                {suggestions.map((text, index) => (
                    <button
                        key={index}
                        onClick={() => onSuggestionClick(text)}
                        className="text-sm bg-sky-800/50 text-sky-200 px-3 py-1.5 rounded-lg hover:bg-sky-700/70 transition-colors border border-sky-700/50"
                    >
                        {text}
                    </button>
                ))}
            </div>
        </div>
    );
};
