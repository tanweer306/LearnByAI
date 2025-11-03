'use client';

import { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { X, Loader2, Play, Pause, Square } from 'lucide-react';
import type { SpeechStatus } from '@/hooks/useTextToSpeech';

interface AudioPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  status: SpeechStatus;
  audioSrc: string | null;
  error: string | null;
  onPlay: () => Promise<void> | void;
  onPause: () => void;
  onStop: () => void;
  registerAudioElement: (element: HTMLAudioElement | null) => void;
}

export default function AudioPlayerModal({
  isOpen,
  onClose,
  title,
  status,
  audioSrc,
  error,
  onPlay,
  onPause,
  onStop,
  registerAudioElement,
}: AudioPlayerModalProps) {
  const handleAudioRef = useCallback(
    (node: HTMLAudioElement | null) => {
      registerAudioElement(node);
    },
    [registerAudioElement]
  );

  const statusLabel = useMemo(() => {
    switch (status) {
      case 'generating':
        return 'Generating audio…';
      case 'playing':
        return 'Playing audio';
      case 'ready':
        return 'Audio ready to play';
      case 'paused':
        return 'Audio paused';
      case 'error':
        return error || 'Audio unavailable';
      case 'idle':
      default:
        return 'Idle';
    }
  }, [status, error]);

  const hasAudio = Boolean(audioSrc);
  const isGenerating = status === 'generating';
  const isPlaying = status === 'playing';
  const playDisabled = !hasAudio || isPlaying || isGenerating;
  const pauseDisabled = !hasAudio || !isPlaying;
  const stopDisabled = !hasAudio;
  const showLoader = isGenerating;
  const showError = status === 'error' && error;

  const handlePlayClick = useCallback(async () => {
    try {
      await onPlay();
    } catch (err) {
      console.error('Playback failed:', err);
    }
  }, [onPlay]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 text-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-white/70 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-4 py-6 space-y-4">
          <div className="flex items-center gap-2 text-sm text-white/80">
            {showLoader && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
            <span>{statusLabel}</span>
          </div>

          {showError && (
            <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/40 rounded-lg p-3">
              {error}
            </div>
          )}

          {hasAudio ? (
            <audio
              key={audioSrc ?? 'audio-player'}
              ref={handleAudioRef}
              src={audioSrc ?? undefined}
              controls
              className="w-full rounded-md border border-white/10 bg-black/20"
            />
          ) : (
            <div className="h-24 flex items-center justify-center rounded-md border border-dashed border-white/20 text-white/60">
              {showLoader ? 'Preparing audio…' : 'Audio will appear here once ready.'}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-white/10 flex items-center gap-2">
          <Button
            onClick={handlePlayClick}
            size="sm"
            disabled={playDisabled}
            className="flex-1 bg-blue-600 hover:bg-blue-500"
          >
            <Play className="h-4 w-4 mr-2" />
            Play
          </Button>
          <Button
            onClick={onPause}
            size="sm"
            disabled={pauseDisabled}
            variant="outline"
            className="flex-1 border-white/30 text-white/80 hover:text-white"
          >
            <Pause className="h-4 w-4 mr-2" />
            Pause
          </Button>
          <Button
            onClick={onStop}
            size="sm"
            disabled={stopDisabled}
            variant="outline"
            className="flex-1 border-white/30 text-white/80 hover:text-white"
          >
            <Square className="h-4 w-4 mr-2" />
            Stop
          </Button>
        </div>
      </div>
    </div>
  );
}
