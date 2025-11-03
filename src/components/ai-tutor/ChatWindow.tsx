'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Send, X, BookOpen, Loader2, Volume2, LoaderCircle } from 'lucide-react';
import { TextSelection } from './PDFViewer';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import AudioPlayerModal from '@/components/ai-tutor/AudioPlayerModal';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pageReference?: number;
  selectedText?: string;
  timestamp: Date;
  sources?: Array<{
    chunkId: string;
    page: number;
    text: string;
    score: number;
  }>;
  youtubeSearchTerm?: string;
  imageSearchTerm?: string;
  originalContent?: string;
  translatedContent?: string;
  language?: string;
  tokensUsed?: number;
  audioStatus?: 'idle' | 'generating' | 'ready' | 'playing' | 'error';
  audioSrc?: string | null;
  audioError?: string | null;
}

interface ChatWindowProps {
  bookId: string;
  bookTitle: string;
  selectedText?: string;
  pageNumber?: number;
  onNavigateToPage?: (page: number) => void;
  onClearSelection?: () => void;
  triggerExplain?: boolean;
  onExplainComplete?: () => void;
  onSuggestedSearchTerms?: (terms: { youtube?: string; images?: string }) => void;
  conversationId?: string;
  onConversationIdChange?: (id: string) => void;
  loadConversationId?: string;
  preferredLanguage?: string;
}

export default function ChatWindow({
  bookId,
  bookTitle,
  selectedText,
  pageNumber,
  onNavigateToPage,
  onClearSelection,
  triggerExplain,
  onExplainComplete,
  onSuggestedSearchTerms,
  conversationId,
  onConversationIdChange,
  loadConversationId,
  preferredLanguage = 'en',
}: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string>(
    conversationId || crypto.randomUUID()
  );
  const [activeAudioMessageId, setActiveAudioMessageId] = useState<string | null>(null);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const {
    generate,
    play,
    pause,
    stop,
    reset,
    registerAudioElement,
    status: speechStatus,
    audioSrc: speechAudioSrc,
    error: speechError,
  } = useTextToSpeech();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!activeAudioMessageId) {
      reset();
    }
  }, [activeAudioMessageId, reset]);

  // Load conversation when loadConversationId changes
  useEffect(() => {
    if (loadConversationId) {
      loadConversation(loadConversationId);
    }
  }, [loadConversationId]);

  // Notify parent of conversation ID changes
  useEffect(() => {
    if (onConversationIdChange && currentConversationId) {
      onConversationIdChange(currentConversationId);
    }
  }, [currentConversationId, onConversationIdChange]);

  useEffect(() => {
    // Focus input when selected text changes
    if (selectedText) {
      inputRef.current?.focus();
    }
  }, [selectedText]);

  useEffect(() => {
    // Auto-send explanation when triggered
    if (triggerExplain && selectedText) {
      handleSendMessage();
      if (onExplainComplete) {
        onExplainComplete();
      }
    }
  }, [triggerExplain]);

  const loadConversation = async (convId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/ai-tutor/conversations/${convId}`);
      if (response.ok) {
        const data = await response.json();
        const conversation = data.conversation;
        
        const loadedMessages: ChatMessage[] = conversation.messages.map((msg: any) => {
          const metadata = msg.metadata || {};
          const relevantPages = msg.relevant_pages || [];
          const timestamp = msg.timestamp ? new Date(msg.timestamp) : new Date();

          return {
            id: crypto.randomUUID(),
            role: msg.role,
            content: msg.content,
            timestamp,
            pageReference: relevantPages[0],
            sources: relevantPages.map((page: number) => ({
              chunkId: page.toString(),
              page,
              text: '',
              score: 0,
            })),
            youtubeSearchTerm: msg.youtubeSearchTerm,
            imageSearchTerm: msg.imageSearchTerm,
            originalContent: metadata.originalAnswer || msg.originalContent,
            translatedContent: metadata.translatedAnswer || msg.translatedContent || msg.content,
            language: metadata.language || msg.language,
            tokensUsed: msg.tokens_used,
            selectedText: msg.selected_text,
          } as ChatMessage;
        });
        
        setMessages(loadedMessages);
        setCurrentConversationId(convId);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConversation = async (updatedMessages: ChatMessage[]) => {
    try {
      // Transform ChatMessage to MongoDB format
      const dbMessages = updatedMessages.map((msg) => {
      const base = {
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        tokens_used: msg.tokensUsed || 0,
        relevant_pages: msg.sources?.map((s) => s.page) || [],
      } as any;

      if (msg.role === 'assistant') {
        base.metadata = {
          originalAnswer: msg.originalContent || msg.content,
          translatedAnswer: msg.translatedContent || msg.content,
          language: msg.language || preferredLanguage,
        };
      }

      return base;
    });

      await fetch('/api/ai-tutor/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          conversationId: currentConversationId,
          messages: dbMessages,
        }),
      });
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() && !selectedText) return;

    const messageContent = input.trim() || `Explain this: "${selectedText}"`;
    
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageContent,
      pageReference: selectedText ? pageNumber : undefined,
      selectedText: selectedText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-tutor/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          question: messageContent,
          conversationId: null,
          preferredLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();

      const aiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: preferredLanguage !== 'en' ? data.translatedAnswer : data.originalAnswer,
        originalContent: data.originalAnswer,
        translatedContent: data.translatedAnswer,
        language: data.language || preferredLanguage,
        sources: data.relevantPages?.map((p: any) => ({
          chunkId: p.pageNumber.toString(),
          page: p.pageNumber,
          text: p.textPreview || '',
          score: p.score || 0,
        })) || [],
        timestamp: new Date(),
        youtubeSearchTerm: data.youtubeSearchTerm,
        imageSearchTerm: data.imageSearchTerm,
      };

      if (onSuggestedSearchTerms) {
        console.log("🔍 Search terms from AI:", {
          youtube: data.youtubeSearchTerm,
          images: data.imageSearchTerm,
        });
        onSuggestedSearchTerms({
          youtube: data.youtubeSearchTerm,
          images: data.imageSearchTerm,
        });
      }

      setMessages((prev) => {
        const updated = [...prev, aiMessage];
        // Auto-save conversation after AI response
        saveConversation(updated);
        return updated;
      });
    } catch (error) {
      console.error('Error:', error);
      
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      if (onClearSelection) {
        onClearSelection();
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const resetMessageAudioState = (messageId: string | null) => {
    if (!messageId) return;
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, audioStatus: 'ready' } : msg
      )
    );
  };

  const handleListenClick = async (message: ChatMessage) => {
    if (message.role !== 'assistant') return;

    setIsAudioModalOpen(true);

    if (message.id === activeAudioMessageId) {
      if (speechStatus === 'playing') {
        pause();
      } else {
        try {
          await play();
        } catch (err) {
          console.error('Playback failed:', err);
        }
      }
      return;
    }

    const previousActiveId = activeAudioMessageId;
    setActiveAudioMessageId(message.id);
    stop();

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === message.id) {
          return { ...msg, audioStatus: 'generating', audioError: null };
        }
        if (msg.id === previousActiveId) {
          return { ...msg, audioStatus: 'ready' };
        }
        return msg;
      })
    );

    try {
      await generate(message.content, { autoPlay: true });
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === message.id
            ? { ...msg, audioStatus: 'ready', audioError: null }
            : msg
        )
      );
    } catch (error: any) {
      console.error('Failed to generate audio:', error);
      const errorMessage =
        error?.message === 'TTS_MODEL_UNAVAILABLE'
          ? 'Text-to-speech model is unavailable. Please contact support.'
          : error?.message || 'Failed to generate audio.';

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === message.id
            ? { ...msg, audioStatus: 'error', audioError: errorMessage }
            : msg
        )
      );
      setActiveAudioMessageId(null);
      setIsAudioModalOpen(false);
    }
  };

  const handleAudioModalClose = () => {
    stop();
    setIsAudioModalOpen(false);
    resetMessageAudioState(activeAudioMessageId);
    setActiveAudioMessageId(null);
  };

  const handleAudioModalStop = () => {
    stop();
    resetMessageAudioState(activeAudioMessageId);
  };
  const activeAudioMessage = messages.find((msg) => msg.id === activeAudioMessageId);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Welcome to AI Tutor
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select text from the book and click "Explain with AI" or ask any question about the content.
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
              }`}
            >
              {message.selectedText && (
                <div className={`text-xs mb-2 pb-2 border-b ${
                  message.role === 'user' 
                    ? 'border-white/20' 
                    : 'border-gray-300 dark:border-gray-700'
                }`}>
                  <div className="flex items-center gap-1 mb-1">
                    <BookOpen className="h-3 w-3" />
                    <span className="font-medium">From page {message.pageReference}</span>
                  </div>
                  <p className={`italic ${
                    message.role === 'user' 
                      ? 'text-white/80' 
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    "{message.selectedText.substring(0, 100)}
                    {message.selectedText.length > 100 ? '...' : ''}"
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex flex-col gap-2">
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>

                  {message.role === 'assistant' && (
                    <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="bg-white/10 dark:bg-gray-700 hover:bg-white/20 flex items-center gap-1"
                        onClick={() => handleListenClick(message)}
                      >
                        {message.audioStatus === 'generating' ? (
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Volume2 className="h-3.5 w-3.5" />
                        )}
                        {message.audioStatus === 'generating'
                          ? 'Generating…'
                          : message.id === activeAudioMessageId && speechStatus === 'playing'
                          ? 'Pause'
                          : 'Listen'}
                      </Button>
                    </div>
                  )}
                </div>

                {message.role === 'assistant' && message.originalContent && message.translatedContent && message.originalContent !== message.translatedContent && (
                  <div className="rounded-lg border border-purple-300 dark:border-purple-700 bg-purple-50/70 dark:bg-purple-900/20 p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">
                      <span>Original (English)</span>
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                      {message.originalContent}
                    </p>
                  </div>
                )}

                {message.role === 'assistant' && message.language && message.language !== 'en' && (
                  <div className="inline-flex items-center gap-2 text-xs font-medium text-purple-600 dark:text-purple-300 bg-purple-100/60 dark:bg-purple-900/30 px-2 py-1 rounded">
                    <span>🌐 Translated to: {message.language.toUpperCase()}</span>
                  </div>
                )}
              </div>

              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-700">
                  <p className="text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
                    📚 Sources:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {message.sources.map((source, idx) => (
                      <button
                        key={idx}
                        onClick={() => onNavigateToPage && onNavigateToPage(source.page)}
                        className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors cursor-pointer"
                      >
                        Page {source.page}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className={`text-xs mt-2 ${
                message.role === 'user' 
                  ? 'text-white/60' 
                  : 'text-gray-500 dark:text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 max-w-[85%]">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-gray-600 dark:text-gray-400">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        {selectedText && (
          <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-900 dark:text-blue-300">
                <BookOpen className="h-4 w-4" />
                <span>Selected text from page {pageNumber}</span>
              </div>
              <Button
                onClick={onClearSelection}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/40"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
              "{selectedText}"
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              selectedText 
                ? "Ask a question or press Enter to explain..." 
                : "Ask a question about the book..."
            }
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            rows={2}
            disabled={isLoading}
          />

          <Button
            onClick={handleSendMessage}
            disabled={isLoading || (!input.trim() && !selectedText)}
            className="px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>

      <AudioPlayerModal
        isOpen={isAudioModalOpen && Boolean(activeAudioMessage)}
        onClose={handleAudioModalClose}
        title={activeAudioMessage ? 'AI Response Audio' : 'Audio Player'}
        status={speechStatus}
        audioSrc={speechAudioSrc}
        error={speechError || activeAudioMessage?.audioError || null}
        onPlay={() => play()}
        onPause={() => pause()}
        onStop={handleAudioModalStop}
        registerAudioElement={registerAudioElement}
      />
    </div>
  );
}
