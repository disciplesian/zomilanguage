import { Audio } from 'expo-av';
import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import { isMacCatalyst as detectMacCatalyst } from '@/lib/errorHandler';

const TOOLKIT_URL = (process.env.EXPO_PUBLIC_TOOLKIT_URL ?? 'https://toolkit.rork.com').replace(/\/$/, '');
const TOOLKIT_KEY = process.env.EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY ?? '';

/**
 * AI voices via Vercel AI Gateway through the Rork toolkit proxy.
 * grok-tts is the primary engine; openai/tts-1 is the fallback.
 */
const TTS_MODELS: { model: string; voice: string }[] = [
  { model: 'xai/grok-tts', voice: 'eve' },
  { model: 'openai/tts-1', voice: 'alloy' },
];

const MAX_TTS_CHARS = 1200;
const MAX_WEB_CACHE = 16;

/** Small in-memory audio cache for web playback (native uses the file system). */
const webAudioCache = new Map<string, string>();

const getUseWebTTS = (): boolean => {
  try {
    const isMacCatalystDetected = detectMacCatalyst();
    return Platform?.OS === 'web' || isMacCatalystDetected;
  } catch {
    return false;
  }
};

function fnvHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** Generate speech audio (base64 MP3) through the AI Gateway TTS proxy. */
async function generateSpeechBase64(text: string): Promise<string | null> {
  if (!TOOLKIT_KEY) return null;
  for (const { model, voice } of TTS_MODELS) {
    try {
      const response = await fetch(`${TOOLKIT_URL}/v2/vercel/v4/ai/speech-model`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TOOLKIT_KEY}`,
          'Content-Type': 'application/json',
          'ai-model-id': model,
          'ai-gateway-protocol-version': '0.0.1',
        },
        body: JSON.stringify({
          text: text.slice(0, MAX_TTS_CHARS),
          voice,
          outputFormat: 'mp3',
        }),
      });
      if (!response.ok) {
        console.log(`TTS: model ${model} failed (${response.status})`);
        continue;
      }
      const json = (await response.json()) as { audio?: string };
      if (json.audio) return json.audio;
    } catch (err) {
      console.log(`TTS: model ${model} error:`, err);
    }
  }
  return null;
}

export interface TTSOptions {
  language: 'en' | 'zomi';
  rate?: number;
}

export type TTSSpeed = 0.5 | 0.75 | 1.0 | 1.25 | 1.5 | 2.0;

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState<TTSSpeed>(1.0);
  const [error, setError] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const htmlAudioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isStoppingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      if (htmlAudioRef.current) {
        try {
          htmlAudioRef.current.pause();
          htmlAudioRef.current.src = '';
        } catch {}
        htmlAudioRef.current = null;
      }
      if (getUseWebTTS() && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {
          console.warn('TTS: cleanup error:', e);
        }
      }
    };
  }, []);

  const stopInternal = useCallback(async () => {
    if (isStoppingRef.current) {
      console.log('TTS: Already stopping, skipping');
      return;
    }

    isStoppingRef.current = true;
    const webTTS = getUseWebTTS();

    try {
      if (webTTS) {
        if (htmlAudioRef.current) {
          try {
            htmlAudioRef.current.pause();
            htmlAudioRef.current.src = '';
          } catch {}
          htmlAudioRef.current = null;
        }
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            window.speechSynthesis.cancel();
          } catch (e) {
            console.warn('TTS: speechSynthesis.cancel error:', e);
          }
        }
        utteranceRef.current = null;
      } else if (soundRef.current) {
        try {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded) {
            await soundRef.current.stopAsync();
            await soundRef.current.unloadAsync();
          }
        } catch (soundError: any) {
          if (!soundError.message?.includes('Seeking interrupted')) {
            console.error('TTS: Sound stop error', soundError);
          }
        }
        soundRef.current = null;
      }

      if (mountedRef.current) {
        setIsSpeaking(false);
      }
    } catch (err) {
      console.error('TTS: Stop error', err);
      if (mountedRef.current) {
        setIsSpeaking(false);
      }
    } finally {
      isStoppingRef.current = false;
    }
  }, []);

  /** Play AI-generated speech in the browser via a data URI. */
  const playWebAudio = useCallback(async (base64: string, text: string, rate: number): Promise<boolean> => {
    if (typeof document === 'undefined') return false;
    try {
      const audio = document.createElement('audio');
      audio.src = `data:audio/mp3;base64,${base64}`;
      audio.volume = 1.0;
      audio.playbackRate = rate;
      htmlAudioRef.current = audio;
      audio.onended = () => {
        if (mountedRef.current) setIsSpeaking(false);
        htmlAudioRef.current = null;
      };
      audio.onerror = () => {
        if (mountedRef.current) setIsSpeaking(false);
        htmlAudioRef.current = null;
      };
      await audio.play();
      return true;
    } catch (err) {
      console.log('TTS: HTML audio playback failed, falling back:', err);
      htmlAudioRef.current = null;
      return false;
    }
  }, []);

  /** Browser speechSynthesis fallback for when the AI engine is unreachable. */
  const speakWithBrowserTTS = useCallback((text: string, rate: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (mountedRef.current) {
        setError('Speech synthesis is not supported on this platform.');
        setIsSpeaking(false);
      }
      return;
    }
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn('TTS: speechSynthesis.cancel error:', e);
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utteranceRef.current = utterance;

    utterance.onend = () => {
      if (mountedRef.current) setIsSpeaking(false);
      utteranceRef.current = null;
    };
    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      const errorType = event.error;
      if (errorType === 'canceled' || errorType === 'interrupted') {
        if (mountedRef.current) setIsSpeaking(false);
        utteranceRef.current = null;
        return;
      }
      if (mountedRef.current) {
        setError('Speech synthesis failed. Please try again.');
        setIsSpeaking(false);
      }
      utteranceRef.current = null;
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS: speechSynthesis.speak error:', e);
      if (mountedRef.current) {
        setError('Speech synthesis failed.');
        setIsSpeaking(false);
      }
    }
  }, []);

  /** Legacy fallback: Google Translate TTS URL via expo-av (native only). */
  const playLegacyUrl = useCallback(async (text: string, rate: number): Promise<boolean> => {
    try {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
      } catch (audioModeError: any) {
        const message = String(audioModeError?.message || '');
        if (
          message.indexOf('TurboModule') !== -1 ||
          message.indexOf('NSException') !== -1 ||
          message.indexOf('Native module') !== -1
        ) {
          console.warn('TTS: Native audio not available on this platform');
          return false;
        }
        console.warn('TTS: Audio mode setup warning (non-fatal):', audioModeError);
      }

      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
        text.substring(0, 200)
      )}&tl=en&client=tw-ob`;

      let newSound: Audio.Sound;
      try {
        const result = await Audio.Sound.createAsync(
          { uri: ttsUrl },
          {
            shouldPlay: true,
            rate,
            volume: 1.0,
          }
        );
        newSound = result.sound;
      } catch (createError: any) {
        const message = String(createError?.message || '');
        if (
          message.indexOf('TurboModule') !== -1 ||
          message.indexOf('NSException') !== -1 ||
          message.indexOf('Native module') !== -1
        ) {
          console.warn('TTS: Native audio not available on this platform');
          return false;
        }
        throw createError;
      }

      soundRef.current = newSound;
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (status.didJustFinish) {
            if (mountedRef.current) setIsSpeaking(false);
            newSound?.unloadAsync().catch(() => {});
            soundRef.current = null;
          }
        } else if (status.error) {
          console.error('TTS: Playback error', status.error);
          if (mountedRef.current) {
            setError('Audio playback failed. Please try again.');
            setIsSpeaking(false);
          }
          soundRef.current = null;
        }
      });
      return true;
    } catch (audioError: any) {
      console.error('TTS: Audio setup error', audioError);
      return false;
    }
  }, []);

  const speak = useCallback(async (text: string, options: TTSOptions = { language: 'en' }) => {
    if (!text || !text.trim()) {
      console.log('TTS: No text to speak');
      return;
    }

    setError(null);

    try {
      await stopInternal();

      if (mountedRef.current) {
        setIsSpeaking(true);
      }
      const rate = options.rate || currentSpeed;
      console.log(`TTS: Speaking "${text.substring(0, 50)}..." at speed ${rate}`);

      const webTTS = getUseWebTTS();
      const cacheKey = fnvHash(`${options.language}|${text}`);

      if (webTTS) {
        // Preferred: AI-generated speech (Vercel AI Gateway via Rork toolkit).
        let base64 = webAudioCache.get(cacheKey) ?? null;
        if (!base64) {
          base64 = await generateSpeechBase64(text);
          if (base64) {
            webAudioCache.set(cacheKey, base64);
            if (webAudioCache.size > MAX_WEB_CACHE) {
              const oldest = webAudioCache.keys().next().value;
              if (oldest !== undefined) webAudioCache.delete(oldest);
            }
          }
        }
        if (base64) {
          const played = await playWebAudio(base64, text, rate);
          if (played) return;
        }
        // Fallback: browser speech synthesis.
        speakWithBrowserTTS(text, rate);
        return;
      }

      // Native: AI-generated speech cached to a file, played via expo-av.
      try {
        const { File, Paths } = await import('expo-file-system');
        const audioFile = new File(Paths.cache, `tts_${cacheKey}.mp3`);
        if (!audioFile.exists) {
          const base64 = await generateSpeechBase64(text);
          if (!base64) throw new Error('tts_unavailable');
          audioFile.write(base64, { encoding: 'base64' });
        }

        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
          });
        } catch (audioModeError: any) {
          console.warn('TTS: Audio mode setup warning (non-fatal):', audioModeError);
        }

        const { sound } = await Audio.Sound.createAsync(
          { uri: audioFile.uri },
          { shouldPlay: true, rate, volume: 1.0 }
        );
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            if (status.didJustFinish) {
              if (mountedRef.current) setIsSpeaking(false);
              sound?.unloadAsync().catch(() => {});
              soundRef.current = null;
            }
          } else if (status.error) {
            console.error('TTS: Playback error', status.error);
            if (mountedRef.current) {
              setError('Audio playback failed. Please try again.');
              setIsSpeaking(false);
            }
            soundRef.current = null;
          }
        });
        return;
      } catch (nativeError) {
        console.log('TTS: AI speech unavailable, using legacy fallback:', nativeError);
      }

      // Last resort: legacy Google Translate TTS URL.
      const played = await playLegacyUrl(text, rate);
      if (!played) {
        if (mountedRef.current) {
          setError('Audio playback is not available on this platform.');
          setIsSpeaking(false);
        }
      }
    } catch (err) {
      console.error('TTS: General error', err);
      if (mountedRef.current) {
        setError('Text-to-speech failed. Please try again.');
        setIsSpeaking(false);
      }
    }
  }, [currentSpeed, stopInternal, playWebAudio, speakWithBrowserTTS, playLegacyUrl]);

  const stop = stopInternal;

  const setSpeed = useCallback((speed: TTSSpeed) => {
    console.log(`TTS: Setting speed to ${speed}`);
    setCurrentSpeed(speed);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    currentSpeed,
    setSpeed,
    error,
    clearError,
    availableSpeeds: [0.5, 0.75, 1.0, 1.25, 1.5, 2.0] as TTSSpeed[],
  };
}
