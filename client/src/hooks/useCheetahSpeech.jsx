import { useState, useRef, useCallback, useEffect } from 'react';
import { WebVoiceProcessor } from '@picovoice/web-voice-processor';

const PICOVOICE_ACCESS_KEY = import.meta.env.VITE_PICOVOICE_ACCESS_KEY;

export function useCheetahSpeech() {
  const [isListening, setIsListening] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  
  const workerRef = useRef(null);
  const voiceProcessorRef = useRef(null);
  const initializingRef = useRef(false);

  // Lazy initialization - only load when needed
  const initializeCheetah = useCallback(async () => {
    if (workerRef.current || initializingRef.current) return;
    initializingRef.current = true;

    try {
      // Create worker
      workerRef.current = new Worker(
          new URL('../worker/cheetahWebWorker.jsx', import.meta.url),
        { type: 'module' }
      );

      // Handle messages from worker
      workerRef.current.onmessage = (event) => {
        const { type, transcript: newTranscript, error: workerError } = event.data;
        
        switch (type) {
          case 'READY':
            setIsReady(true);
            break;
          case 'TRANSCRIPT':
            // Append new transcript (throttled from worker)
            setTranscript(prev => prev + newTranscript);
            break;
          case 'ERROR':
            setError(workerError);
            setIsListening(false);
            break;
        }
      };

      // Initialize Cheetah in worker
      workerRef.current.postMessage({
        type: 'INIT',
        payload: {
          accessKey: PICOVOICE_ACCESS_KEY,
          modelPath: '/models/cheetah_params.pv' // Put model in public folder
        }
      });
    } catch (err) {
      setError(err.message);
      initializingRef.current = false;
    }
  }, []);

  // Audio frame handler
  const audioFrameHandler = useCallback((audioFrame) => {
    if (workerRef.current) {
      // Transfer audio data to worker
      workerRef.current.postMessage(
        { type: 'PROCESS_AUDIO', payload: { audioFrame } },
        [audioFrame.buffer] // Transfer ownership for performance
      );
    }
  }, []);

  // Start listening
  const startListening = useCallback(async () => {
    setError(null);
    
    // Lazy-load Cheetah on first use
    if (!isReady) {
      await initializeCheetah();
      // Wait for READY message
      await new Promise(resolve => {
        const checkReady = setInterval(() => {
          if (isReady) {
            clearInterval(checkReady);
            resolve();
          }
        }, 100);
      });
    }

    try {
      // Start microphone capture
      voiceProcessorRef.current = await WebVoiceProcessor.subscribe(audioFrameHandler);
      setIsListening(true);
    } catch (err) {
      setError(`Microphone error: ${err.message}`);
    }
  }, [isReady, initializeCheetah, audioFrameHandler]);

  // Stop listening
  const stopListening = useCallback(async () => {
    if (voiceProcessorRef.current) {
      await WebVoiceProcessor.unsubscribe(audioFrameHandler);
      voiceProcessorRef.current = null;
    }
    
    // Flush remaining transcript
    workerRef.current?.postMessage({ type: 'STOP' });
    setIsListening(false);
  }, [audioFrameHandler]);

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      workerRef.current?.postMessage({ type: 'RELEASE' });
      workerRef.current?.terminate();
    };
  }, [stopListening]);

  return {
    transcript,
    isListening,
    isReady,
    error,
    startListening,
    stopListening,
    resetTranscript,
    browserSupportsSpeechRecognition: typeof AudioWorklet !== 'undefined'
  };
}