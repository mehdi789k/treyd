
import React from 'react';
import { Sparkles, Globe } from 'lucide-react';
import { timezones } from '../data/symbols';


interface TimezoneSelectorProps {
  timezone: string;
  setTimezone: (tz: string) => void;
}

const TimezoneSelector: React.FC<TimezoneSelectorProps> = ({ timezone, setTimezone }) => (
  <div className="relative flex items-center">
    <Globe className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
    <select
      value={timezone}
      onChange={(e) => setTimezone(e.target.value)}
      className="appearance-none bg-gray-800/60 border border-gray-700 rounded-md py-1.5 pr-10 pl-2 text-xs text-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
      aria-label="انتخاب منطقه زمانی"
    >
      {timezones.map(tz => (
        <option key={tz.id} value={tz.id} className="bg-gray-800 text-gray-200">
          {tz.name}
        </option>
      ))}
    </select>
  </div>
);

interface LayoutProps {
  children: React.ReactNode;
  timezone: string;
  setTimezone: (tz: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, timezone, setTimezone }) => {
  return (
    <div className="min-h-screen flex flex-col bg-transparent text-gray-200">
       <style>{`
        @keyframes underline-grow {
          from { width: 0%; transform: translateX(50%); }
          to { width: 100%; transform: translateX(0); }
        }
        .underline-grow-active {
          animation: underline-grow 0.3s forwards;
        }
      `}</style>
      <header className="bg-gray-900/50 backdrop-blur-lg border-b border-gray-700/50 sticky top-0 z-50">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white"/>
               </div>
              <span className="font-bold text-xl text-gray-100">هوش مالی Plus</span>
            </div>
            <div className="flex items-center gap-4">
              <TimezoneSelector timezone={timezone} setTimezone={setTimezone} />
              <span className="hidden sm:inline text-sm text-gray-400">قدرت گرفته از Gemini AI</span>
            </div>
          </div>
        </nav>
      </header>
      <main className="flex-grow">{children}</main>
      <footer className="bg-transparent mt-12">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} تحلیلگر هوشمند مالی. تمام حقوق محفوظ است.</p>
        </div>
      </footer>
    </div>
  );
};
