import { useState } from "react";
import { Bot, Globe } from "lucide-react";
import { LanguageConfig } from "@/lib/types/language";

interface EmptyStateProps {
  onLanguageSelect: (config: LanguageConfig) => void;
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
];

export function EmptyState({ onLanguageSelect }: EmptyStateProps) {
  const [hasStarted, setHasStarted] = useState(false);
    const [nativeLanguage, setNativeLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('langbot-native');
      return saved || 'fr';
    }
    return 'fr';
  });
  const [targetLanguage, setTargetLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('langbot-target');
      return saved || 'en';
    }
    return 'en';
  });

  const handleStart = () => {
    if (nativeLanguage === targetLanguage) {
      alert('Please select different languages for native and target.');
      return;
    }
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('langbot-native', nativeLanguage);
      localStorage.setItem('langbot-target', targetLanguage);
    }
    
    onLanguageSelect({ nativeLanguage, targetLanguage });
    setHasStarted(true);
  };
  

if (hasStarted) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-20">
      {/* Bot Icon */}
      <div className="w-16 h-16 mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-md">
        <Bot className="w-9 h-9 text-white" />
      </div>

      {/* Title */}
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
        Ready to practice!
      </h2>

      {/* Subtitle */}
      <p className="text-gray-600 dark:text-gray-400 max-w-md">
        Start typing your message below to begin your language learning journey.
      </p>
    </div>
  );
}

return (
  <div className="flex flex-col items-center justify-center h-full text-center px-4 py-2">
    {/* Bot Icon */}
    <div className="w-16 h-16 mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-md">
      <Bot className="w-9 h-9 text-white" />
    </div>

    {/* Title */}
    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
      Welcome to LangBot
    </h2>

    {/* Subtitle */}
    <p className="text-gray-600 dark:text-gray-400 max-w-md mb-8">
      Choose your languages to start practicing with our AI tutor.
    </p>

    {/* Form Container */}
    <div className="w-full max-w-md space-y-6">
      {/* Native Language */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-5 h-5 text-blue-500" />
          <label className="text-sm font-medium text-gray-900 dark:text-white">
            Your Native Language
          </label>
        </div>
        <select
          value={nativeLanguage}
          onChange={(e) => setNativeLanguage(e.target.value)}
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      {/* Target Language */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-5 h-5 text-purple-500" />
          <label className="text-sm font-medium text-gray-900 dark:text-white">
            Language You Want to Learn
          </label>
        </div>
        <select
          value={targetLanguage}
          onChange={(e) => setTargetLanguage(e.target.value)}
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      {/* Start Button */}
      <button
        onClick={handleStart}
        className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        Start Learning
      </button>
    </div>
  </div>
);

}