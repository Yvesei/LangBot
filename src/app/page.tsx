"use client"
import { useState, useRef, useEffect } from "react";
import { send } from "@/lib/api/index";
import { ChatMessage, ConversationContext } from "@/lib/types";
import { ChatHeader } from "@/components/ui/chat/ChatHeader";
import { ChatInput } from "@/components/ui/chat/ChatInput";
import { Message } from "@/components/ui/chat/Message";
import { LoadingIndicator } from "@/components/ui/indicators/LoadingIndicator";
import { ErrorDisplay } from "@/components/ui/states/ErrorDisplay";
import { EmptyState } from "@/components/ui/states/EmptyState";
import { TopicsPanel } from "@/components/ui/panels/TopicsPanel";
import { setLanguageConfig } from "@/lib/config/language";
import { LanguageConfig } from "@/lib/types/language";

export default function Page() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<ConversationContext>({
    messages: [],
    learningLanguage: 'English',
    userLevel: 'beginner',
    topicsDiscussed: [],
    commonMistakes: []
  });
  const [languageSelected, setLanguageSelected] = useState(false);

  const handleLanguageSelect = (config: LanguageConfig) => {
    setLanguageConfig(config);
    setLanguageSelected(true);
  };
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Wait a tick for DOM update, then scroll
    const el = messagesEndRef.current;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [messages, loading]);
  
  useEffect(() => {
    setContext(prev => ({
      ...prev,
      messages: messages
    }));
  }, [messages]);

  async function handleSend() {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || loading) return;

    setPrompt('');
    setError(null);
    setLoading(true);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmedPrompt,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await send(trimmedPrompt, messages, context);

      if (response.success) {
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.message,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, aiMessage]);
        updateLearningContext(trimmedPrompt, response.message);
      } else {
        setError(response.error || 'Failed to get response');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error('Chat error:', err);
    } finally {
      setLoading(false);
    }
  }

  function updateLearningContext(userInput: string, aiResponse: string) {
    setContext(prev => {
      const newContext = { ...prev };
      
      const topics = extractTopics(userInput);
      topics.forEach(topic => {
        if (!newContext.topicsDiscussed?.includes(topic)) {
          newContext.topicsDiscussed = [...(newContext.topicsDiscussed || []), topic];
        }
      });
      
      if (aiResponse.includes('correct') || aiResponse.includes('should be') || aiResponse.includes('instead of')) {
        const mistake = userInput.toLowerCase();
        if (!newContext.commonMistakes?.includes(mistake)) {
          newContext.commonMistakes = [...(newContext.commonMistakes || []), mistake];
        }
      }
      
      return newContext;
    });
  }

  function extractTopics(text: string): string[] {
    const topicKeywords = {
      food: ['eat', 'restaurant', 'cook', 'dinner', 'lunch', 'breakfast'],
      travel: ['trip', 'vacation', 'country', 'airport', 'hotel'],
      work: ['job', 'office', 'meeting', 'colleague', 'boss'],
      hobbies: ['hobby', 'interest', 'sport', 'music', 'movie'],
      family: ['family', 'parent', 'child', 'brother', 'sister']
    };
    
    const topics: string[] = [];
    const lowerText = text.toLowerCase();
    
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        topics.push(topic);
      }
    });
    
    return topics;
  }

  function clearChat() {
    setMessages([]);
    setError(null);
    setContext({
      messages: [],
      learningLanguage: 'English',
      userLevel: 'beginner', 
      topicsDiscussed: [],
      commonMistakes: []
    });
  }

  return (
    <div className="relative flex flex-col h-screen bg-white dark:bg-gray-900">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {messages.length === 0 ? (
            <EmptyState onLanguageSelect={handleLanguageSelect}/>
          ) : (
            <>
              <TopicsPanel topics={context.topicsDiscussed} onClearChat={clearChat} />
              
              <div className="space-y-6">
                {messages.map((message) => (
                  <Message key={message.id} message={message} />
                ))}
              </div>
            </>
          )}
          
          {loading && <LoadingIndicator />}
          {error && <ErrorDisplay error={error} />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <ChatInput 
        prompt={prompt}
        setPrompt={setPrompt}
        loading={loading}
        onSend={handleSend}
        disabled={!languageSelected}
      />
    </div>
  );
}