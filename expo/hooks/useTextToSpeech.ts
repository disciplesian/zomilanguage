import { Audio } from 'expo-av';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import { isMacCatalyst as detectMacCatalyst } from '@/lib/errorHandler';

const getUseWebTTS = (): boolean => {
  try {
    const isMacCatalystDetected = detectMacCatalyst();
    return Platform?.OS === 'web' || isMacCatalystDetected;
  } catch {
    return false;
  }
};

export interface TTSOptions {
  language: 'en' | 'zomi';
  rate?: number;
  pitch?: number;
}

export type TTSSpeed = 0.5 | 0.75 | 1.0 | 1.25 | 1.5 | 2.0;

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState<TTSSpeed>(1.0);
  const [error, setError] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isStoppingRef = useRef(false);
  const mountedRef = useRef(true);
  
  // Web TTS detection is computed dynamically in callbacks
  void useMemo(() => getUseWebTTS(), []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      const webTTSCleanup = getUseWebTTS();
      if (webTTSCleanup && typeof window !== 'undefined' && 'speechSynthesis' in window) {
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
      console.log('TTS: Stopping speech');
      
      if (webTTS) {
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
      console.log(`TTS: Speaking "${text.substring(0, 50)}..." at speed ${options.rate || currentSpeed}`);

      const webTTS = getUseWebTTS();
      if (webTTS) {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            window.speechSynthesis.cancel();
          } catch (e) {
            console.warn('TTS: speechSynthesis.cancel error:', e);
          }
          
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = options.language === 'en' ? 'en-US' : 'en-US';
          utterance.rate = options.rate || currentSpeed;
          utterance.pitch = options.pitch || 1.0;
          utterance.volume = 1.0;

          utteranceRef.current = utterance;

          utterance.onend = () => {
            console.log('TTS: Speech ended');
            if (mountedRef.current) {
              setIsSpeaking(false);
            }
            utteranceRef.current = null;
          };

          utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
            const errorType = event.error;
            console.log('TTS: Speech error type:', errorType);
            
            if (errorType === 'canceled' || errorType === 'interrupted') {
              console.log('TTS: Speech was canceled or interrupted (expected)');
              setIsSpeaking(false);
              utteranceRef.current = null;
              return;
            }
            
            let errorMessage = 'Speech synthesis failed. Please try again.';
            switch (errorType) {
              case 'audio-busy':
                errorMessage = 'Audio is busy. Please wait and try again.';
                break;
              case 'network':
                errorMessage = 'Network error. Please check your connection.';
                break;
              case 'synthesis-unavailable':
              case 'synthesis-failed':
                errorMessage = 'Speech synthesis is unavailable. Please try again later.';
                break;
              case 'language-unavailable':
              case 'voice-unavailable':
                errorMessage = 'Voice not available for this language.';
                break;
              case 'text-too-long':
                errorMessage = 'Text is too long to speak. Please try shorter text.';
                break;
              default:
                console.error('TTS: Unexpected speech error:', errorType);
            }
            
            if (mountedRef.current) {
              setError(errorMessage);
              setIsSpeaking(false);
            }
            utteranceRef.current = null;
          };

          utterance.onstart = () => {
            console.log('TTS: Speech started');
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
        } else {
          console.warn('TTS: Speech synthesis not supported on this platform');
          if (mountedRef.current) {
            setError('Speech synthesis is not supported on this platform.');
            setIsSpeaking(false);
          }
        }
      } else {
        try {
          try {
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: false,
              playsInSilentModeIOS: true,
              staysActiveInBackground: false,
              shouldDuckAndroid: true,
            });
          } catch (audioModeError: any) {
            const errorMessage = String(audioModeError?.message || '');
            if (errorMessage.indexOf('TurboModule') !== -1 || 
                errorMessage.indexOf('NSException') !== -1 ||
                errorMessage.indexOf('Native module') !== -1) {
              console.warn('TTS: Native audio not available on this platform');
              if (mountedRef.current) {
                setError('Audio playback is not available on this platform.');
                setIsSpeaking(false);
              }
              return;
            }
            console.warn('TTS: Audio mode setup warning (non-fatal):', audioModeError);
          }

          const langCode = options.language === 'en' ? 'en' : 'en';
          const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
            text.substring(0, 200)
          )}&tl=${langCode}&client=tw-ob`;

          console.log('TTS: Loading audio from URL');
          
          let newSound: Audio.Sound | null = null;
          try {
            const result = await Audio.Sound.createAsync(
              { uri: ttsUrl },
              { 
                shouldPlay: true,
                rate: options.rate || currentSpeed,
                volume: 1.0,
              }
            );
            newSound = result.sound;
          } catch (createError: any) {
            const errorMessage = String(createError?.message || '');
            if (errorMessage.indexOf('TurboModule') !== -1 || 
                errorMessage.indexOf('NSException') !== -1 ||
                errorMessage.indexOf('Native module') !== -1) {
              console.warn('TTS: Native audio not available on this platform');
              if (mountedRef.current) {
                setError('Audio playback is not available on this platform.');
                setIsSpeaking(false);
              }
              return;
            }
            throw createError;
          }

          if (!newSound) {
            if (mountedRef.current) {
              setError('Failed to create audio.');
              setIsSpeaking(false);
            }
            return;
          }

          soundRef.current = newSound;

          newSound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded) {
              if (status.didJustFinish) {
                console.log('TTS: Playback finished');
                if (mountedRef.current) {
                  setIsSpeaking(false);
                }
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
        } catch (audioError: any) {
          console.error('TTS: Audio setup error', audioError);
          const errorMessage = String(audioError?.message || '');
          if (mountedRef.current) {
            if (errorMessage.indexOf('TurboModule') !== -1 || 
                errorMessage.indexOf('NSException') !== -1 ||
                errorMessage.indexOf('Native module') !== -1) {
              setError('Audio playback is not available on this platform.');
            } else {
              setError('Failed to play audio. Please check your connection.');
            }
            setIsSpeaking(false);
          }
        }
      }
    } catch (err) {
      console.error('TTS: General error', err);
      if (mountedRef.current) {
        setError('Text-to-speech failed. Please try again.');
        setIsSpeaking(false);
      }
    }
  }, [currentSpeed, stopInternal]);

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
