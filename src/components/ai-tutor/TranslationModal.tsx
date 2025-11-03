'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Copy, Send, Loader2, CheckCircle } from 'lucide-react';
import { getLanguageName, isRTL } from '@/lib/languages';

interface TranslationModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  targetLanguage: string;
  pageNumber?: number;
  bookId: string;
  onSendToChat?: (translatedText: string) => void;
}

export default function TranslationModal({
  isOpen,
  onClose,
  originalText,
  targetLanguage,
  pageNumber,
  bookId,
  onSendToChat,
}: TranslationModalProps) {
  const [translation, setTranslation] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && originalText && targetLanguage) {
      translateText();
    }
  }, [isOpen, originalText, targetLanguage]);

  const translateText = async () => {
    setIsLoading(true);
    setError(null);
    setTranslation('');

    try {
      const response = await fetch('/api/translate/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: originalText,
          targetLanguage,
          sourceLanguage: 'en',
          bookId,
          pageNumber,
        }),
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();
      setTranslation(data.translation);
    } catch (err: any) {
      setError(err.message || 'Failed to translate text');
      console.error('Translation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(translation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSendToChat = () => {
    if (onSendToChat && translation) {
      onSendToChat(translation);
      onClose();
    }
  };

  if (!isOpen) return null;

  const targetLangName = getLanguageName(targetLanguage);
  const isRTLLanguage = isRTL(targetLanguage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-xl">🌐</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Translation</h2>
              <p className="text-sm text-gray-400">English → {targetLangName}</p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-gray-800"
          >
            <X className="h-5 w-5 text-gray-400" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Original Text */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="text-xs font-semibold text-gray-400 uppercase">Original (English)</div>
              {pageNumber && (
                <div className="text-xs text-gray-500">Page {pageNumber}</div>
              )}
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{originalText}</p>
            </div>
          </div>

          {/* Translated Text */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase mb-2">
              Translation ({targetLangName})
            </div>
            <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-700/50 min-h-[120px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                  <span className="ml-2 text-gray-400">Translating...</span>
                </div>
              ) : error ? (
                <div className="text-red-400 text-sm">{error}</div>
              ) : translation ? (
                <p
                  className="text-white leading-relaxed whitespace-pre-wrap"
                  dir={isRTLLanguage ? 'rtl' : 'ltr'}
                >
                  {translation}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-700 flex gap-2">
          <Button
            onClick={handleCopy}
            disabled={!translation || isLoading}
            variant="outline"
            className="flex-1 bg-gray-800 hover:bg-gray-700 border-gray-600"
          >
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Translation
              </>
            )}
          </Button>
          {onSendToChat && (
            <Button
              onClick={handleSendToChat}
              disabled={!translation || isLoading}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              <Send className="h-4 w-4 mr-2" />
              Send to Chat
            </Button>
          )}
          <Button
            onClick={onClose}
            variant="outline"
            className="bg-gray-800 hover:bg-gray-700 border-gray-600"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}