'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export type SpeechStatus = 'idle' | 'generating' | 'ready' | 'playing' | 'paused' | 'error';

export interface GenerateSpeechOptions {
  voice?: string;
  format?: 'mp3' | 'wav' | 'ogg';
  model?: string;
  autoPlay?: boolean;
}

interface SpeechState {
  status: SpeechStatus;
  audioSrc: string | null;
  error: string | null;
}

export function useTextToSpeech(initialVoice?: string) {
  const [state, setState] = useState<SpeechState>({ status: 'idle', audioSrc: null, error: null });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const registerAudioElement = useCallback((element: HTMLAudioElement | null) => {
    if (audioRef.current === element) {
      return;
    }

    if (audioRef.current) {
      audioRef.current.onplay = null;
      audioRef.current.onpause = null;
      audioRef.current.onended = null;
    }

    audioRef.current = element;

    if (element) {
      element.onplay = () => setState((prev) => ({ ...prev, status: 'playing' }));
      element.onpause = () => setState((prev) => ({ ...prev, status: prev.audioSrc ? 'ready' : 'idle' }));
      element.onended = () => setState((prev) => ({ ...prev, status: prev.audioSrc ? 'ready' : 'idle' }));
    }
  }, []);

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setState((prev) => ({ ...prev, status: prev.audioSrc ? 'ready' : 'idle' }));
  }, []);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setState({ status: 'idle', audioSrc: null, error: null });
  }, []);

  const play = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      await audioRef.current.play();
      setState((prev) => ({ ...prev, status: 'playing', error: null }));
    } catch (error: any) {
      setState((prev) => ({ ...prev, status: 'ready', error: error?.message || 'Unable to play audio' }));
      throw error;
    }
  }, []);

  const pause = useCallback(() => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    setState((prev) => ({ ...prev, status: prev.audioSrc ? 'ready' : 'idle' }));
  }, []);

  const generate = useCallback(
    async (text: string, options: GenerateSpeechOptions = {}) => {
      if (!text?.trim()) {
        return null;
      }

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setState((prev) => ({ ...prev, status: 'generating', error: null }));

      try {
        const response = await fetch('/api/audio/speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voice: options.voice || initialVoice,
            format: options.format,
            model: options.model,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          let serverMessage = 'Failed to synthesize speech';
          try {
            const errorPayload = await response.json();
            if (typeof errorPayload?.message === 'string') {
              serverMessage = errorPayload.message;
            } else if (typeof errorPayload?.error === 'string') {
              serverMessage = errorPayload.error;
            }
          } catch (parseError) {
            // ignore JSON parse errors and keep default message
          }

          setState((prev) => ({ ...prev, status: 'error', error: serverMessage }));
          throw new Error(serverMessage);
        }

        const data = await response.json();
        if (!data.audio) {
          const noAudioMessage = 'No audio data returned';
          setState((prev) => ({ ...prev, status: 'error', error: noAudioMessage }));
          throw new Error(noAudioMessage);
        }

        const audioSrc = `data:audio/${data.format || 'mp3'};base64,${data.audio}`;
        setState({ status: 'ready', audioSrc, error: null });

        if (options.autoPlay) {
          // allow time for consumer to register audio element before attempting to play
          setTimeout(() => {
            play().catch(() => {
              /* handled in play */
            });
          }, 0);
        }

        return audioSrc;
      } catch (error: any) {
        if (controller.signal.aborted) {
          setState((prev) => ({ ...prev, status: prev.audioSrc ? 'ready' : 'idle' }));
          throw error;
        }

        const message = error?.message || 'Failed to synthesize speech';
        setState((prev) => ({ ...prev, status: 'error', error: message }));
        throw error;
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [initialVoice, play]
  );

  useEffect(() => () => reset(), [reset]);

  return {
    generate,
    play,
    pause,
    stop,
    reset,
    registerAudioElement,
    status: state.status,
    audioSrc: state.audioSrc,
    error: state.error,
  };
}
