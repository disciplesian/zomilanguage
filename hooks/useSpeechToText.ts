import { Audio } from 'expo-av';
import { useState, useCallback, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import { isMacCatalyst as detectMacCatalyst } from '@/lib/errorHandler';

const STT_API_URL = 'https://toolkit.rork.com/stt/transcribe/';

let isMacCatalystDetected = false;
try {
  isMacCatalystDetected = detectMacCatalyst();
} catch {
  isMacCatalystDetected = false;
}
const useWebRecording = Platform.OS === 'web' || isMacCatalystDetected;

export function useSpeechToText() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startDurationTimer = useCallback(() => {
    setRecordingDuration(0);
    durationIntervalRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    
    try {
      console.log('STT: Requesting audio permissions...');
      
      if (useWebRecording) {
        try {
          if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
            setError('Audio recording is not supported on this platform.');
            return;
          }
          
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          
          let mimeType = 'audio/webm';
          if (typeof MediaRecorder !== 'undefined') {
            if (MediaRecorder.isTypeSupported('audio/webm')) {
              mimeType = 'audio/webm';
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
              mimeType = 'audio/mp4';
            } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
              mimeType = 'audio/ogg';
            }
          }
          
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType,
          });
          
          audioChunksRef.current = [];
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };
          
          mediaRecorderRef.current = mediaRecorder;
          mediaRecorder.start(100);
          
          setIsRecording(true);
          startDurationTimer();
          console.log('STT: Web/Mac recording started with mimeType:', mimeType);
        } catch (webError) {
          console.error('STT: Web recording error', webError);
          setError('Microphone access denied. Please allow microphone access.');
          return;
        }
      } else {
        try {
          let permission;
          try {
            permission = await Audio.requestPermissionsAsync();
          } catch (permError: any) {
            const errorMessage = permError?.message || '';
            if (errorMessage.includes('TurboModule') || 
                errorMessage.includes('NSException') ||
                errorMessage.includes('Native module')) {
              console.warn('STT: Native audio not available on this platform');
              setError('Audio recording is not available on this platform.');
              return;
            }
            throw permError;
          }
          
          if (permission.status !== 'granted') {
            setError('Microphone permission required for voice input.');
            Alert.alert('Permission Required', 'Please allow microphone access to use voice input.');
            return;
          }

          try {
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: true,
              playsInSilentModeIOS: true,
            });
          } catch (audioModeError: any) {
            const errorMessage = audioModeError?.message || '';
            if (errorMessage.includes('TurboModule') || 
                errorMessage.includes('NSException') ||
                errorMessage.includes('Native module')) {
              console.warn('STT: Native audio not available on this platform');
              setError('Audio recording is not available on this platform.');
              return;
            }
            console.warn('STT: Audio mode setup warning (non-fatal):', audioModeError);
          }

          console.log('STT: Starting native recording...');
          let recording;
          try {
            const result = await Audio.Recording.createAsync(
              Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            recording = result.recording;
          } catch (recordError: any) {
            const errorMessage = recordError?.message || '';
            if (errorMessage.includes('TurboModule') || 
                errorMessage.includes('NSException') ||
                errorMessage.includes('Native module')) {
              console.warn('STT: Native audio not available on this platform');
              setError('Audio recording is not available on this platform.');
              return;
            }
            throw recordError;
          }
          
          recordingRef.current = recording;
          setIsRecording(true);
          startDurationTimer();
          console.log('STT: Native recording started');
        } catch (nativeError: any) {
          console.error('STT: Native recording error:', nativeError);
          const errorMessage = nativeError?.message || '';
          if (errorMessage.includes('TurboModule') || 
              errorMessage.includes('NSException') ||
              errorMessage.includes('Native module')) {
            setError('Audio recording is not available on this platform.');
          } else {
            setError('Failed to start recording. Audio may not be supported on this device.');
          }
          return;
        }
      }
    } catch (err) {
      console.error('STT: Failed to start recording:', err);
      setError('Failed to start recording. Please try again.');
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  }, [startDurationTimer]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    stopDurationTimer();
    
    if (useWebRecording) {
      if (!mediaRecorderRef.current) {
        console.log('STT: No web recording to stop');
        return null;
      }

      return new Promise((resolve) => {
        const mediaRecorder = mediaRecorderRef.current!;
        
        mediaRecorder.onstop = async () => {
          setIsRecording(false);
          setIsTranscribing(true);
          
          try {
            const mimeType = mediaRecorder.mimeType || 'audio/webm';
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            console.log('STT: Audio blob created, size:', audioBlob.size, 'type:', mimeType);
            
            const formData = new FormData();
            const extension = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
            formData.append('audio', audioBlob, `recording.${extension}`);
            
            console.log('STT: Sending to transcription API...');
            const response = await fetch(STT_API_URL, {
              method: 'POST',
              body: formData,
            });
            
            if (!response.ok) {
              throw new Error(`Transcription failed: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('STT: Transcription result:', result);
            
            setIsTranscribing(false);
            resolve(result.text || null);
          } catch (err) {
            console.error('STT: Transcription error:', err);
            setError('Failed to transcribe audio. Please try again.');
            setIsTranscribing(false);
            resolve(null);
          }
          
          try {
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
          } catch (e) {
            console.warn('STT: Error stopping tracks:', e);
          }
          mediaRecorderRef.current = null;
          audioChunksRef.current = [];
        };
        
        try {
          mediaRecorder.stop();
        } catch (e) {
          console.warn('STT: Error stopping mediaRecorder:', e);
          setIsRecording(false);
          setIsTranscribing(false);
          resolve(null);
        }
      });
    }

    if (!recordingRef.current) {
      console.log('STT: No native recording to stop');
      return null;
    }

    try {
      console.log('STT: Stopping native recording...');
      setIsRecording(false);
      
      await recordingRef.current.stopAndUnloadAsync();
      
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
      } catch (audioModeError) {
        console.warn('STT: Audio mode reset warning (non-fatal):', audioModeError);
      }

      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        setError('Failed to save recording.');
        Alert.alert('Error', 'Failed to save recording.');
        return null;
      }

      console.log('STT: Recording saved at:', uri);
      setIsTranscribing(true);

      const uriParts = uri.split('.');
      const fileType = uriParts[uriParts.length - 1];

      const formData = new FormData();
      formData.append('audio', {
        uri,
        name: `recording.${fileType}`,
        type: `audio/${fileType}`,
      } as unknown as Blob);

      console.log('STT: Sending to transcription API...');
      const response = await fetch(STT_API_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('STT: Transcription result:', result);

      setIsTranscribing(false);
      return result.text || null;
    } catch (err) {
      console.error('STT: Failed to transcribe:', err);
      setError('Failed to transcribe audio. Please try again.');
      setIsTranscribing(false);
      Alert.alert('Error', 'Failed to transcribe audio. Please try again.');
      return null;
    }
  }, [stopDurationTimer]);

  const cancelRecording = useCallback(async () => {
    stopDurationTimer();
    
    if (useWebRecording) {
      if (mediaRecorderRef.current) {
        try {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        } catch (e) {
          console.warn('STT: Error stopping tracks on cancel:', e);
        }
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
      }
    } else if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
          });
        } catch (audioModeError) {
          console.warn('STT: Audio mode reset warning (non-fatal):', audioModeError);
        }
        recordingRef.current = null;
      } catch (err) {
        console.error('STT: Failed to cancel recording:', err);
      }
    }
    
    setIsRecording(false);
    setRecordingDuration(0);
  }, [stopDurationTimer]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isRecording,
    isTranscribing,
    recordingDuration,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    clearError,
  };
}
