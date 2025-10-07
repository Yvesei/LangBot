"use client";
import { useState } from "react";
import { Bot, User, ArrowLeft, ScanLine, ArrowRight, Copy, Trash, Languages } from "lucide-react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import { translateMessage, correctMessage } from "@/lib/api/index";
import { ChatMessage } from "@/lib/types";
import { escapeHTML } from "@/lib/utils";

export function Message({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  message.content = escapeHTML(message.content);

  // State for translation
  const [translation, settranslation] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  
  // State for correction
  const [correctedContent, setCorrectedContent] = useState<string | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [isCorrecting, setIsCorrecting] = useState(false);

  // Get display content based on current view
  const displayContent = isUser 
    ? (showCorrection && correctedContent ? correctedContent : message.content)
    : (showTranslation && translation ? translation : message.content);


  // handle delete
  const [isDeleted, setIsDeleted] = useState(false);

  // Handle translation
  const handleTranslate = async () => {
    if (translation) {
      // If already translated, just toggle view
      setShowTranslation(!showTranslation);
      return;
    }

    setIsTranslating(true);
    try {
      const result = await translateMessage(message.content);

      if (result.success && result.translation) {
        settranslation(result.translation);
        setShowTranslation(true);
      } else {
        console.error('Translation failed:', result.error);
      }
    } catch (error) {
      console.error('Error translating message:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  // Handle correction
  const handleCorrect = async () => {
    if (correctedContent) {
      // If already corrected, just toggle view
      setShowCorrection(!showCorrection);
      return;
    }

    setIsCorrecting(true);
    try {
      const result = await correctMessage(message.content);
      
      if (result.success && result.correctedContent) {
        if (result.correctedContent === "[CORRECT]") {
          //TODO
          setShowCorrection(true);
          return;
        }
        setCorrectedContent(result.correctedContent);
        setShowCorrection(true);
      } else {
        console.error('Correction failed:', result.error);
      }
    } catch (error) {
      console.error('Error correcting message:', error);
    } finally {
      setIsCorrecting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleted(true);
  }

  // Handle copy
  const handleCopy = async () => {
    console.log(navigator.clipboard);
    console.log(navigator.clipboard?.writeText);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(displayContent);
      } catch (err) {
        console.error("Failed to copy: ", err);
      }
    } else {
      // Fallback for local dev environment without HTTPS
      const textarea = document.createElement("textarea");
      textarea.value = displayContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  };


  // Navigation for assistant messages (original <-> translated)
  const handlePrevious = () => {
    if (translation) {
      setShowTranslation(false);
    }
  };

  const handleNext = () => {
    if (translation) {
      setShowTranslation(true);
    }
  };

  
  return (
    <div className={`group flex ${isUser ? "justify-end" : "justify-start"} ${isDeleted ? 'hidden' : ''}`}>
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="w-7 mt-4 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
        </div>
      )}

      <div className={`min-w-0 flex flex-col relative ${isUser ? "items-end" : "items-start"}`}>
        { isUser && showCorrection ?
        <FontAwesomeIcon icon={faCircleCheck}  className="absolute z-10 w-5 h-5 transform translate-y-0 -top-1 left-1"/>
        : null}
        <div
          className={`inline-block px-5 py-2.5 rounded-3xl ${
            isUser
              ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white text-right"
              : "bg-transparent text-left"
          }`}
        >
          <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed m-0">
            {displayContent}
          </pre>
        </div>

        <div
          className={`flex items-center gap-2 mt-2 px-2 opacity-0 group-hover:opacity-100 transition-opacity ${
            isUser ? "self-end" : "self-start"
          }`}
        >
          {message.role === "assistant" ? (
            <>
              <button 
                onClick={handlePrevious}
                disabled={!showTranslation}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={handleNext}
                disabled={!translation || showTranslation}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <button 
                onClick={handleTranslate}
                disabled={isTranslating}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors disabled:opacity-50"
              >
                <Languages className={`w-4 h-4 ${isTranslating ? 'animate-pulse' : ''}`} />
              </button>
              <button 
                onClick={handleCopy}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button onClick={handleDelete} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">
                <Trash className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={handleCorrect}
                disabled={isCorrecting}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors disabled:opacity-50"
              >
                <ScanLine className={`w-4 h-4 ${isCorrecting ? 'animate-pulse' : ''}`} />
              </button>
              <button onClick={handleDelete} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">
                <Trash className="w-4 h-4" />
              </button>
              <button 
                onClick={handleCopy}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-500 ml-2">
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-7 ml-4 mt-2 h-7 bg-gray-300 dark:bg-gray-700 rounded-md flex items-center justify-center">
            <User className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          </div>
        </div>
      )}
    </div>
  );
}