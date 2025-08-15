import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Circle, Mic, MessageSquare } from 'lucide-react';

// Components
import { VideoPlayer } from './components/VideoPlayer';
import { ModeSelector } from './components/ModeSelector';
import { ConsentForm } from './components/ConsentForm';
import { FeedbackCapture } from './components/FeedbackCapture';
import { ProgressIndicator } from './components/ProgressIndicator';
import { AccessibilityControls } from './components/AccessibilityControls';

// Hooks
import { useVideoProcessing } from './hooks/useVideoProcessing';
import { useGoogleDrive } from './hooks/useGoogleDrive';
import { useSupabaseFeedback } from './hooks/useSupabaseFeedback';
import { useFFmpeg } from './hooks/useFFmpeg';

// Utils
import { saveSession, loadSession, clearSession } from './utils/storage';

// Types
import { AppState, FeedbackResponse } from './types';

// Config
import { VIDEO_CONFIG } from './config/videos';

const STEP_LABELS = ['Welcome', 'Mode', 'Consent', 'Feedback', 'Complete'];

function App() {
  // Core state
  const [state, setState] = useState<AppState>({
    currentStep: 'welcome',
    currentQuestion: 1,
    selectedMode: null,
    consent: null,
    responses: [],
    isProcessing: false,
    error: null,
    highContrast: false
  });

  // Accessibility state
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Continuous recording state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const [continuousRecordingBlob, setContinuousRecordingBlob] = useState<Blob | null>(null);
  const [isContinuousRecordingActive, setIsContinuousRecordingActive] = useState(false);
  const [continuousRecordingTime, setContinuousRecordingTime] = useState(0);
  const [finalRecordingDuration, setFinalRecordingDuration] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  // Content completion tracking state
  const [aiVideoCompleted, setAiVideoCompleted] = useState(false);
  const [userContentCompleted, setUserContentCompleted] = useState(false);

  // Function to stop recording and wait for blob creation
  const stopRecordingAndGetBlob = useCallback((): Promise<Blob> => {
    console.log('🛑 stopRecordingAndGetBlob called');
    console.log('📊 Current state:', {
      hasMediaRecorder: !!mediaRecorderRef.current,
      isContinuousRecordingActive,
      selectedMode: state.selectedMode,
      recordedChunksLength: recordedChunksRef.current.length
    });
    
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current || !isContinuousRecordingActive) {
        console.log('❌ No active recording to stop');
        reject(new Error('No active recording to stop'));
        return;
      }

      const mediaRecorder = mediaRecorderRef.current;
      
      // Set up one-time event handlers for this specific stop operation
      const handleStop = () => {
        console.log('🎬 MediaRecorder stopped event fired');
        console.log('MediaRecorder stopped, creating blob...');
        const mimeType = state.selectedMode === 'video' ? 'video/webm' : 'audio/webm';
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        console.log('📦 Blob created:', {
          size: blob.size,
          type: blob.type,
          chunksCount: recordedChunksRef.current.length
        });
        setContinuousRecordingBlob(blob);
        console.log('✅ continuousRecordingBlob state updated');
        
        // Capture the final recording duration before resetting
        setFinalRecordingDuration(continuousRecordingTime);
        console.log('📊 Final recording duration captured:', continuousRecordingTime);
        
        setIsContinuousRecordingActive(false);
        console.log('✅ isContinuousRecordingActive set to false');
        
        // Stop media stream tracks to turn off camera/microphone
        if (mediaStreamRef.current) {
          console.log('🔇 Stopping media stream tracks');
          mediaStreamRef.current.getTracks().forEach(track => {
            console.log(`Stopping ${track.kind} track`);
            track.stop();
          });
          mediaStreamRef.current = null;
          console.log('✅ Media stream cleared');
        }
        
        console.log('🎉 Recording stop process completed, resolving promise');
        resolve(blob);
      };
      
      const handleError = (event: MediaRecorderErrorEvent) => {
        console.error('MediaRecorder error during stop:', event);
        setRecordingError(event.error ? `Recording error: ${event.error.message}` : 'Recording error occurred');
        setIsContinuousRecordingActive(false);
        reject(new Error(event.error ? event.error.message : 'Recording error occurred'));
      };
      
      // Add event listeners
      mediaRecorder.addEventListener('stop', handleStop, { once: true });
      mediaRecorder.addEventListener('error', handleError, { once: true });
      
      // Stop the recording
      console.log(`🛑 Calling mediaRecorder.stop() for ${state.selectedMode} recording`);
      console.log(`Stopping continuous ${state.selectedMode} recording...`);
      mediaRecorder.stop();
    });
  }, [state.selectedMode, isContinuousRecordingActive, continuousRecordingTime]);

  // Hooks
  const { uploadToGoogleDrive, isUploading, uploadProgress } = useGoogleDrive();
  const { 
    loadFFmpeg, 
    concatenateVideos, 
    createVideoFromAudioAndImage, 
    isLoading: ffmpegLoading, 
    isReady: ffmpegReady, 
    progress: ffmpegProgress, 
    error: ffmpegError 
  } = useFFmpeg();
  const { 
    createFeedbackSession, 
    saveFeedbackResponse,
    saveContinuousMediaFeedback,
    updateSessionCompletion,
    isUploading: isSupabaseUploading,
    uploadProgress: supabaseUploadProgress,
    error: supabaseError
  } = useSupabaseFeedback();

  // Load FFmpeg when component mounts
  useEffect(() => {
    loadFFmpeg().catch(console.error);
  }, [loadFFmpeg]);

  // Load saved session on mount
  useEffect(() => {
    const savedSession = loadSession();
    if (savedSession) {
      setState(prev => ({ ...prev, ...savedSession }));
    }
    
    // Debug: Log video configuration
    console.log('App started - Video config:', VIDEO_CONFIG);
  }, []);

  // Save session whenever state changes
  useEffect(() => {
    saveSession(state);
  }, [state]);

  // Apply high contrast styles
  useEffect(() => {
    if (state.highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [state.highContrast]);

  // Create Supabase session when consent and mode are determined
  useEffect(() => {
    const createSession = async () => {
      if (state.consent !== null && state.selectedMode && !currentSessionId) {
        console.log('Creating Supabase session with:', { consent: state.consent, mode: state.selectedMode });
        const sessionId = await createFeedbackSession(state.consent, state.selectedMode);
        if (sessionId) {
          setCurrentSessionId(sessionId);
          console.log('Created Supabase session:', sessionId);
        } else {
          console.error('Failed to create Supabase session');
          updateState({ 
            error: 'Failed to initialize feedback session. Please refresh and try again.',
          });
        }
      }
    };

    createSession();
  }, [state.consent, state.selectedMode, currentSessionId, createFeedbackSession]);

  // Start continuous recording when media mode is selected and we have consent
  useEffect(() => {
    const startContinuousRecording = async () => {
      if (
        (state.selectedMode === 'video' || state.selectedMode === 'audio') && 
        state.consent !== null && 
        !isContinuousRecordingActive
      ) {
        console.log('🎥 Continuous recording conditions met:', {
          selectedMode: state.selectedMode,
          consent: state.consent,
          isContinuousRecordingActive: isContinuousRecordingActive,
          currentStep: state.currentStep
        });
        
        try {
          setRecordingError(null);
          console.log(`Starting continuous ${state.selectedMode} recording...`);
          
          // Request media stream
          const constraints = state.selectedMode === 'video' 
            ? { video: true, audio: true }
            : { audio: true };
            
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          mediaStreamRef.current = stream;
          
          // Initialize MediaRecorder
          const mimeType = state.selectedMode === 'video' ? 'video/webm' : 'audio/webm';
          const mediaRecorder = new MediaRecorder(stream, { mimeType });
          mediaRecorderRef.current = mediaRecorder;
          recordedChunksRef.current = [];
          
          // Set up event handlers
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              recordedChunksRef.current.push(event.data);
            }
          };
          
          // Note: onstop and onerror handlers are now managed by stopRecordingAndGetBlob
          // for the final recording to ensure proper Promise resolution
          
          // Start recording
          mediaRecorder.start(1000); // Collect data every second
          setIsContinuousRecordingActive(true);
          console.log('🎬 MediaRecorder started, isContinuousRecordingActive set to true');
          console.log(`Continuous ${state.selectedMode} recording started successfully`);
          
        } catch (error) {
          console.error('Failed to start continuous recording:', error);
          let errorMessage = 'Failed to start recording';
          
          if (error instanceof Error) {
            if (error.name === 'NotAllowedError') {
              errorMessage = `${state.selectedMode === 'video' ? 'Camera and microphone' : 'Microphone'} permission denied. Please allow access and refresh the page.`;
            } else if (error.name === 'NotFoundError') {
              errorMessage = `No ${state.selectedMode === 'video' ? 'camera or microphone' : 'microphone'} found. Please connect the required device and refresh.`;
            } else if (error.name === 'NotReadableError') {
              errorMessage = `${state.selectedMode === 'video' ? 'Camera or microphone' : 'Microphone'} is being used by another application.`;
            } else {
              errorMessage = `Failed to start recording: ${error.message}`;
            }
          }
          
          setRecordingError(errorMessage);
        }
      }
    };

    startContinuousRecording();
    
    // Cleanup function
    return () => {
      if (mediaRecorderRef.current && isContinuousRecordingActive) {
        console.log('Cleaning up: stopping media recorder');
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        console.log('Cleaning up: stopping media stream tracks');
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, [state.selectedMode, state.consent]);

  // Update live video srcObject when media stream changes
  useEffect(() => {
    if (liveVideoRef.current && mediaStreamRef.current) {
      liveVideoRef.current.srcObject = mediaStreamRef.current;
    }
  }, [mediaStreamRef.current, isContinuousRecordingActive]);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isContinuousRecordingActive) {
      interval = setInterval(() => {
        setContinuousRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      setContinuousRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isContinuousRecordingActive]);

  const updateState = useCallback((updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleWelcomeComplete = () => {
    updateState({ currentStep: 'mode-selection' });
  };

  const handleModeSelect = (mode: 'video' | 'audio' | 'text') => {
    updateState({ 
      selectedMode: mode, 
      currentStep: 'consent' 
    });
  };

  const handleConsentChange = (consent: boolean) => {
    updateState({ 
      consent, 
      currentStep: 'feedback' 
    });
  };

  const handleResponse = async (response: FeedbackResponse, isCompleteButton = false) => {
    // For continuous recording modes (video/audio), we don't save individual responses
    // The complete recording will be saved at the end
    if (response.mode === 'text') {
      // Save individual text response to Supabase if session exists
      if (currentSessionId) {
        const saved = await saveFeedbackResponse(currentSessionId, response);
        if (!saved) {
          updateState({ 
            error: 'Failed to save your response. Please try again.',
          });
          return;
        }
      }
    }

    const newResponses = [...state.responses, response];
    updateState({ responses: newResponses });

    // If Complete button was clicked and both content streams are finished, go directly to Thank You
    if (isCompleteButton && aiVideoCompleted && userContentCompleted) {
      await handleDirectComplete();
      return;
    }

    if (state.currentQuestion < 5 && !isCompleteButton) {
      // Move to next question
      updateState({ currentQuestion: state.currentQuestion + 1 });
    } else {
      // Question 5 completed - stop continuous recording and wait for blob
      if ((state.selectedMode === 'video' || state.selectedMode === 'audio') && 
          isContinuousRecordingActive) {
        try {
          // Wait for recording to fully stop and blob to be created
          await stopRecordingAndGetBlob();
          console.log('Continuous recording stopped and blob created successfully');
        } catch (error) {
          console.error('Failed to stop continuous recording:', error);
          updateState({ 
            error: error instanceof Error ? error.message : 'Failed to stop recording',
          });
          return;
        }
      }
      
      // All questions completed, show closing video
      updateState({ currentStep: 'closing' });
    }
  };

  const handleDirectComplete = async () => {
    console.log('🎬 handleDirectComplete called - skipping to Thank You page');
    
    // For video/audio modes, go to ready-to-upload step first
    if (state.selectedMode === 'video' || state.selectedMode === 'audio') {
      updateState({ currentStep: 'ready-to-upload' });
      return;
    }
    
    // For text mode, process directly
    await processAndUpload();
  };

  const processAndUpload = async () => {
    updateState({ 
      currentStep: 'processing',
      isProcessing: true 
    });
    try {
      // For video/audio modes, stop recording and upload
      if (state.selectedMode === 'video' || state.selectedMode === 'audio') {
        if (!continuousRecordingBlob) {
          throw new Error('No recording available to process');
        }

        console.log('🎬 Starting video stitching process...');
        
        // Fetch AI question videos
        console.log('📥 Fetching AI question videos...');
        const aiVideoBlobs: Blob[] = [];
        for (let i = 0; i < VIDEO_CONFIG.questions.length; i++) {
          try {
            const response = await fetch(VIDEO_CONFIG.questions[i]);
            if (!response.ok) {
              throw new Error(`Failed to fetch question ${i + 1} video: ${response.statusText}`);
            }
            const blob = await response.blob();
            aiVideoBlobs.push(blob);
            console.log(`✅ Fetched question ${i + 1} video (${blob.size} bytes)`);
          } catch (error) {
            console.error(`❌ Failed to fetch question ${i + 1} video:`, error);
            throw new Error(`Failed to fetch AI question videos: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        let finalMediaBlob: Blob;

        if (state.selectedMode === 'audio') {
          console.log('🎤 Processing audio mode - creating video from audio...');
          
          // Fetch placeholder image for audio visualization
          try {
            const imageResponse = await fetch('/images/microphone_background.png');
            if (!imageResponse.ok) {
              throw new Error('Failed to fetch microphone background image');
            }
            const imageBlob = await imageResponse.blob();
            console.log('✅ Fetched microphone background image');

            // Create video from user's audio and placeholder image
            const userAudioVideoBlob = await createVideoFromAudioAndImage(
              continuousRecordingBlob,
              imageBlob,
              finalRecordingDuration,
              'user_audio_video.mp4'
            );
            console.log('✅ Created video from audio recording');

            // Concatenate AI videos with user's audio-video
            const allVideoBlobs = [...aiVideoBlobs, userAudioVideoBlob];
            finalMediaBlob = await concatenateVideos(allVideoBlobs, 'final_stitched_video.mp4');
            console.log('✅ Audio mode stitching completed');

          } catch (error) {
            console.error('❌ Audio processing error:', error);
            throw new Error(`Audio processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }

        } else {
          console.log('🎥 Processing video mode - concatenating videos...');
          
          // For video mode, concatenate AI videos with user's video
          const allVideoBlobs = [...aiVideoBlobs, continuousRecordingBlob];
          finalMediaBlob = await concatenateVideos(allVideoBlobs, 'final_stitched_video.mp4');
          console.log('✅ Video mode stitching completed');
        }
        
        console.log('📤 Starting upload to Google Drive...');
       // console.log('📊 Final stitched media blob size:', finalMediaBlob.size, 'bytes');
        const filename = `${state.selectedMode}_stitched_${Date.now()}.mp4`;
        
        // Upload to Google Drive
        const uploadResult = await uploadToGoogleDrive(
          finalMediaBlob,
          filename,
          state.consent || false
        );

        if (uploadResult.success) {
          console.log('✅ Direct upload successful:', uploadResult.fileId);
          
          // Save to Supabase
          if (currentSessionId) {
            const duration = finalRecordingDuration;
            console.log('💾 Saving stitched video to Supabase with duration:', duration);
            await saveContinuousMediaFeedback(
              currentSessionId, 
              state.selectedMode as 'video' | 'audio', 
              uploadResult.fileId, 
              finalMediaBlob.size, 
              duration
            );
            
            await updateSessionCompletion(currentSessionId, uploadResult.fileId);
          }
        } else {
          throw new Error(uploadResult.error || 'Upload failed');
        }
      } else {
        // Text mode - no stitching needed
        console.log('📝 Text mode - no video processing required');
      }
      
      // Go directly to Thank You page
      updateState({ 
        currentStep: 'complete',
        isProcessing: false 
      });
      
      // Clear session after successful completion
      setTimeout(() => {
        clearSession();
        setCurrentSessionId(null);
      }, 5000);
      
    } catch (error) {
      console.error('❌ handleDirectComplete error:', error);
      updateState({ 
        error: error instanceof Error ? error.message : 'Processing failed',
        isProcessing: false 
      });
    }
  };

  const handleAiVideoEnded = () => {
    setAiVideoCompleted(true);
  };

  const handleUserContentCompleted = () => {
    setUserContentCompleted(true);
  };

  const handleClosingComplete = async () => {
    // For video/audio modes, go to ready-to-upload step first
    if (state.selectedMode === 'video' || state.selectedMode === 'audio') {
      updateState({ currentStep: 'ready-to-upload' });
      return;
    }
    
    // For text mode, process directly
    await processAndUpload();
  };


  const handleRestart = () => {
    clearSession();
    setCurrentSessionId(null);
    setState({
      currentStep: 'welcome',
      currentQuestion: 1,
      selectedMode: null,
      consent: null,
      responses: [],
      isProcessing: false,
      error: null,
      highContrast: state.highContrast // Preserve accessibility setting
    });
    
    // Reset continuous recording state
    setContinuousRecordingBlob(null);
    setContinuousRecordingTime(0);
    setFinalRecordingDuration(0);
    setIsContinuousRecordingActive(false);
    setRecordingError(null);
    recordedChunksRef.current = [];
  };
  // Reset content completion tracking when question changes
  React.useEffect(() => {
    setAiVideoCompleted(false);
    setUserContentCompleted(false);
  }, [state.currentQuestion]);

  // For text mode, mark user content as completed immediately
  React.useEffect(() => {
    if (state.selectedMode === 'text') {
      setUserContentCompleted(true);
    }
  }, [state.selectedMode]);

  const getCurrentStepNumber = (): number => {
    switch (state.currentStep) {
      case 'welcome': return 1;
      case 'mode-selection': return 2;
      case 'consent': return 3;
      case 'feedback': return 4;
      case 'closing':
      case 'processing':
      case 'complete': return 5;
      default: return 1;
    }
  };

  const getMainContent = () => {
    switch (state.currentStep) {
      case 'welcome':
        return (
          <VideoPlayer
            src={VIDEO_CONFIG.welcome}
            onEnded={handleWelcomeComplete}
            autoPlay={true}
            aria-label="Welcome message from food truck"
          />
        );

      case 'mode-selection':
        return (
          <ModeSelector
            onModeSelect={handleModeSelect}
            highContrast={state.highContrast}
          />
        );

      case 'consent':
        return (
          <ConsentForm
            onConsentChange={handleConsentChange}
            highContrast={state.highContrast}
          />
        );

      case 'feedback':
        return (
          <div className="space-y-6">
            {/* Debug Info */}
            <div className={`p-4 rounded-lg text-sm ${
              state.highContrast ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
            }`}>
              <p><strong>Debug Info:</strong></p>
              <p>Selected Mode: {state.selectedMode}</p>
              <p>Consent: {state.consent?.toString()}</p>
              <p>Current Step: {state.currentStep}</p>
              <p>Recording Active: {isContinuousRecordingActive.toString()}</p>
              <p>Recording Time: {continuousRecordingTime}s</p>
              <p>Session ID: {currentSessionId}</p>
              {recordingError && <p className="text-red-500">Recording Error: {recordingError}</p>}
            </div>
            
            {/* Split Screen Video Layout */}
            <div className="flex flex-col md:flex-row w-full h-[400px] md:h-[500px] overflow-hidden rounded-lg shadow-lg bg-black">
              {/* AI Video (Left Side) */}
              <div className="w-full md:w-1/2 h-full relative">
                <VideoPlayer
                  src={VIDEO_CONFIG.questions[state.currentQuestion - 1]}
                  onEnded={handleAiVideoEnded}
                  autoPlay={true}
                  controls={false}
                  className="w-full h-full"
                  aria-label={`Feedback question ${state.currentQuestion}`}
                />
                <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-lg text-sm font-medium">
                  AI Question {state.currentQuestion}
                </div>
              </div>
              
              {/* User Live Video (Right Side) - Only for video/audio modes */}
              {(state.selectedMode === 'video' || state.selectedMode === 'audio') && (
                <div className="w-full md:w-1/2 h-full relative bg-gray-900 border-t md:border-t-0 md:border-l border-gray-700">
                  {state.selectedMode === 'video' ? (
                    <video
                      ref={liveVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{ transform: 'scaleX(-1)' }}
                      aria-label="Your live video response"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center text-white">
                        <Mic size={64} className="mx-auto mb-4 text-white" />
                        <p className="text-lg font-medium">Audio Recording</p>
                        <p className="text-sm text-gray-300">Your voice is being captured</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Recording Indicator */}
                  {isContinuousRecordingActive && (
                    <div className={`absolute top-4 right-4 flex items-center space-x-2 px-3 py-2 rounded-lg shadow-lg ${
                      state.highContrast ? 'bg-red-800 text-red-200' : 'bg-red-600 text-white'
                    }`}>
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className={`w-2 h-2 rounded-full ${state.highContrast ? 'bg-red-200' : 'bg-white'}`}
                      />
                      <span className="text-sm font-medium">
                        REC {Math.floor(continuousRecordingTime / 60)}:{(continuousRecordingTime % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  )}
                  
                  {/* Recording Status for Non-Recording State */}
                  {!isContinuousRecordingActive && (
                    <div className="absolute top-4 right-4 bg-gray-600 text-white px-3 py-2 rounded-lg text-sm font-medium">
                      Ready to Record
                    </div>
                  )}
                </div>
              )}
              
              {/* Text Mode - Show placeholder */}
              {state.selectedMode === 'text' && (
                <div className="w-full md:w-1/2 h-full relative bg-gray-800 border-t md:border-t-0 md:border-l border-gray-700 flex items-center justify-center">
                  <div className="text-center text-white">
                    <MessageSquare size={64} className="mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium">Text Response Mode</p>
                    <p className="text-sm text-gray-300">Provide your feedback below</p>
                  </div>
                </div>
              )}
            </div>
            
            {state.selectedMode && (
              <FeedbackCapture
                mode={state.selectedMode}
                questionNumber={state.currentQuestion}
                onResponse={handleResponse}
                onUserContentCompleted={handleUserContentCompleted}
                highContrast={state.highContrast}
                isContinuousRecordingActive={isContinuousRecordingActive}
                continuousRecordingTime={continuousRecordingTime}
                recordingError={recordingError}
                canComplete={aiVideoCompleted && userContentCompleted}
              />
            )}
          </div>
        );

      case 'closing':
        return (
          <VideoPlayer
            src={VIDEO_CONFIG.closing}
            onEnded={handleClosingComplete}
            autoPlay={true}
            aria-label="Closing message from food truck"
          />
        );

      case 'ready-to-upload':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${
                state.highContrast ? 'bg-blue-700' : 'bg-blue-100'
              }`}
            >
              <Truck size={40} className={state.highContrast ? 'text-white' : 'text-blue-600'} />
            </motion.div>
            
            <div>
              <h2 className={`text-2xl font-bold mb-2 ${state.highContrast ? 'text-white' : 'text-gray-800'}`}>
                Ready to Save Your Feedback
              </h2>
              <p className={`text-lg mb-6 ${state.highContrast ? 'text-gray-300' : 'text-gray-600'}`}>
                Click the button below to securely upload your {state.selectedMode} feedback.
              </p>
              
              {state.consent && (
                <p className={`text-sm mb-6 ${state.highContrast ? 'text-gray-400' : 'text-gray-500'}`}>
                  Your response will be uploaded to secure storage and may be featured on our social media platforms.
                </p>
              )}
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={processAndUpload}
              className={`px-8 py-4 rounded-lg font-medium text-lg transition-colors focus:outline-none focus:ring-4 focus:ring-opacity-50 ${
                state.highContrast
                  ? 'bg-blue-700 text-white hover:bg-blue-600 focus:ring-blue-400'
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
              }`}
            >
              Upload My Feedback
            </motion.button>
          </motion.div>
        );

      case 'processing':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${
                state.highContrast ? 'bg-blue-700' : 'bg-blue-100'
              }`}
            >
              <Truck size={40} className={state.highContrast ? 'text-white' : 'text-blue-600'} />
            </motion.div>
            
            <div>
              <h2 className={`text-2xl font-bold mb-2 ${state.highContrast ? 'text-white' : 'text-gray-800'}`}>
                {ffmpegLoading ? 'Loading Video Processor...' : 
                 ffmpegProgress > 0 && ffmpegProgress < 100 ? 'Stitching Your Video...' : 
                 'Uploading Your Feedback...'}
              </h2>
              <p className={`text-lg ${state.highContrast ? 'text-gray-300' : 'text-gray-600'}`}>
                {ffmpegLoading ? 'Preparing video processing tools...' :
                 ffmpegProgress > 0 && ffmpegProgress < 100 ? 'Combining AI questions with your responses...' :
                 'Uploading your feedback to secure storage...'}
              </p>
            </div>

            <div className="space-y-2">
              <div className={`w-full max-w-md mx-auto h-2 rounded-full overflow-hidden ${
                state.highContrast ? 'bg-gray-700' : 'bg-gray-200'
              }`}>
                <motion.div
                  className={`h-full rounded-full ${
                    state.highContrast ? 'bg-blue-500' : 'bg-blue-600'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(ffmpegProgress, uploadProgress, supabaseUploadProgress)}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className={`text-sm ${state.highContrast ? 'text-gray-400' : 'text-gray-500'}`}>
                {Math.max(ffmpegProgress, uploadProgress, supabaseUploadProgress)}% complete
              </p>
              
              {ffmpegError && (
                <p className={`text-sm ${state.highContrast ? 'text-red-300' : 'text-red-600'}`}>
                  Video processing error: {ffmpegError}
                </p>
              )}
              
              {ffmpegError && (
                <p className={`text-sm ${highContrast ? 'text-red-300' : 'text-red-600'}`}>
                  Video processing error: {ffmpegError}
                </p>
              )}
            </div>
          </motion.div>
        );

      case 'complete':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${
                state.highContrast ? 'bg-green-700' : 'bg-green-100'
              }`}
            >
              <Truck size={40} className={state.highContrast ? 'text-white' : 'text-green-600'} />
            </motion.div>
            
            <div>
              <h2 className={`text-3xl font-bold mb-4 ${state.highContrast ? 'text-white' : 'text-gray-800'}`}>
                Thank You! 🎉
              </h2>
              <p className={`text-lg mb-6 ${state.highContrast ? 'text-gray-300' : 'text-gray-600'}`}>
                Your feedback has been successfully recorded and processed!
              </p>
              
              {(state.error || supabaseError) && (
                <p className="text-sm mb-4">{state.error || supabaseError}</p>
              )}
              
              {(state.error || supabaseError) && (
                <p className="text-sm mb-4">{state.error || supabaseError}</p>
              )}
              
              {state.consent && (
                <p className={`text-sm mb-6 ${state.highContrast ? 'text-gray-400' : 'text-gray-500'}`}>
                  Your response may be featured on our social media platforms to help others discover our food truck.
                </p>
              )}
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleRestart}
              className={`px-8 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-4 focus:ring-opacity-50 ${
                state.highContrast
                  ? 'bg-blue-700 text-white hover:bg-blue-600 focus:ring-blue-400'
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
              }`}
            >
              Leave Another Review
            </motion.button>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen transition-all duration-300 ${
      state.highContrast 
        ? 'bg-black text-white' 
        : 'bg-gradient-to-br from-gray-50 to-blue-50'
    }`}>
      {/* Accessibility Controls */}
      <AccessibilityControls
        highContrast={state.highContrast}
        onToggleHighContrast={() => updateState({ highContrast: !state.highContrast })}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
      />

      {/* Header */}
      <header className="pt-8 pb-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className={`inline-flex items-center space-x-3 mb-4 ${
            state.highContrast ? 'text-white' : 'text-gray-800'
          }`}>
            <Truck size={48} className={state.highContrast ? 'text-blue-400' : 'text-blue-600'} />
            <h1 className="text-4xl font-bold">FoodTruck Feedback</h1>
          </div>
          <p className={`text-lg ${state.highContrast ? 'text-gray-300' : 'text-gray-600'}`}>
            Share your experience with us
          </p>
        </motion.div>
      </header>

      {/* Progress Indicator */}
      
      {state.currentStep !== 'complete' && (
        <ProgressIndicator
          currentStep={getCurrentStepNumber()}
          totalSteps={5}
          stepLabels={STEP_LABELS}
          highContrast={state.highContrast}
        />
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Recording Error Indicator */}
        {recordingError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-lg ${
              state.highContrast ? 'bg-red-900 text-red-300' : 'bg-red-50 text-red-800'
            }`}
            role="alert"
          >
            <p className="font-medium mb-1">Recording Error</p>
            <p className="text-sm">{recordingError}</p>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={state.currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {getMainContent()}
          </motion.div>
        </AnimatePresence>

        {/* Error Display */}
        <AnimatePresence>
          {(state.error || supabaseError) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mt-8 p-4 rounded-lg text-center ${
                state.highContrast ? 'bg-red-900 text-red-300' : 'bg-red-50 text-red-800'
              }`}
              role="alert"
            >
              <p className="font-medium mb-2">Something went wrong</p>
              <p className="text-sm mb-4">{state.error || supabaseError}</p>
              <button
                onClick={handleRestart}
                className={`px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-4 focus:ring-opacity-50 ${
                  state.highContrast
                    ? 'bg-blue-700 text-white hover:bg-blue-600 focus:ring-blue-400'
                    : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                }`}
              >
                Start Over
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className={`py-8 text-center text-sm ${
        state.highContrast ? 'text-gray-400' : 'text-gray-500'
      }`}>
        <p>© 2025 FoodTruck Feedback Experience</p>
        <p className="mt-1">
          Your privacy is protected. All responses are handled securely and in compliance with GDPR/CCPA regulations.
        </p>
      </footer>
    </div>
  );
}

export default App;