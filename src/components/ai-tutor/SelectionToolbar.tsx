'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Copy, X, Languages, Volume2, Loader2 } from 'lucide-react';
import { TextSelection } from './PDFViewer';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import AudioPlayerModal from '@/components/ai-tutor/AudioPlayerModal';

interface SelectionToolbarProps {
  selection: TextSelection | null;
  onExplain: () => void;
  onTranslate?: () => void;
  onClear: () => void;
}

export default function SelectionToolbar({
  selection,
  onExplain,
  onTranslate,
  onClear,
}: SelectionToolbarProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(false);
  const { generate, play, pause, stop, status, audioSrc, registerAudioElement, reset, error } = useTextToSpeech();

  const toolbarWidth = useMemo(() => {
    let baseWidth = 340;
    if (onTranslate) baseWidth += 120;
    return baseWidth + 120; // room for audio button + status
  }, [onTranslate]);

  useEffect(() => {
    if (selection) {
      const rect = selection.boundingRect;
      const toolbarHeight = 60;

      let x = rect.left + rect.width / 2 - toolbarWidth / 2;
      let y = rect.top - toolbarHeight - 10;

      const viewportWidth = window.innerWidth;

      if (x < 10) x = 10;
      if (x + toolbarWidth > viewportWidth - 10) x = viewportWidth - toolbarWidth - 10;
      if (y < 10) y = rect.bottom + 10;

      setPosition({ x, y });
      setIsVisible(true);
    } else {
      setIsVisible(false);
      stop();
      reset();
    }
  }, [selection, stop, reset, toolbarWidth]);

  const handleCopy = async () => {
    if (selection) {
      try {
        await navigator.clipboard.writeText(selection.text);
      } catch (err) {
        console.error('Failed to copy text:', err);
      }
    }
  };

  const handleAudioClick = async () => {
    if (!selection?.text) return;

    if (status === 'playing') {
      pause();
      return;
    }

    if (status === 'ready' && audioSrc) {
      setShowAudioModal(true);
      play().catch((err) => {
        console.error('Playback failed:', err);
      });
      return;
    }

    try {
      setShowAudioModal(true);
      await generate(selection.text, { autoPlay: true });
    } catch (err: any) {
      setShowAudioModal(false);
      const message = err?.message === 'TTS_MODEL_UNAVAILABLE'
        ? 'Text-to-speech model is unavailable. Please contact support.'
        : err?.message || 'Failed to generate audio.';
      console.error('Failed to generate audio:', err);
      alert(message);
    }
  };

  const handleModalClose = () => {
    stop();
    setShowAudioModal(false);
  };

  if (!isVisible || !selection) return null;

  const isGenerating = status === 'generating';
  const isPlaying = status === 'playing';
  const buttonLabel = isGenerating ? 'Generating…' : isPlaying ? 'Pause' : 'Listen';

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClear} />

      <div
        className="fixed z-50 bg-white dark:bg-gray-800 shadow-2xl rounded-lg border border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 duration-200"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: toolbarWidth,
        }}
      >
        <div className="flex items-center gap-2 p-2">
          <Button
            onClick={() => {
              onExplain();
              setIsVisible(false);
            }}
            size="sm"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Explain with AI
          </Button>

          {onTranslate && (
            <Button
              onClick={() => {
                onTranslate();
                setIsVisible(false);
              }}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
            >
              <Languages className="h-4 w-4" />
              Translate
            </Button>
          )}

          <Button
            onClick={handleAudioClick}
            size="sm"
            variant="outline"
            className="gap-2"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
            {buttonLabel}
          </Button>

          <Button onClick={handleCopy} size="sm" variant="outline" className="gap-2">
            <Copy className="h-4 w-4" />
            Copy
          </Button>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

          <Button onClick={onClear} size="sm" variant="ghost" className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-3 pb-2 pt-1 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{selection.text}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Page {selection.pageNumber}</p>
        </div>
      </div>

      <AudioPlayerModal
        isOpen={showAudioModal}
        onClose={handleModalClose}
        title="Selected Text Audio"
        status={status}
        audioSrc={audioSrc}
        error={error}
        onPlay={play}
        onPause={pause}
        onStop={stop}
        registerAudioElement={registerAudioElement}
      />
    </>
  );
}
