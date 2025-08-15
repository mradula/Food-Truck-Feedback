import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Webcam from 'react-webcam';
import { 
  Video, 
  Square, 
  Play, 
  Mic,
  Star, 
  AlertCircle,
  CheckCircle,
  Trash2,
  Pause
} from 'lucide-react';
import { validateTextInput, checkDurationLimit } from '../utils/validation';
import { FeedbackResponse } from '../types';

interface FeedbackCaptureProps {
  mode: 'video' | 'audio' | 'text';
  questionNumber: number;
  onResponse: (response: FeedbackResponse, isCompleteButton?: boolean) => void;
  onUserContentCompleted?: () => void;
  highContrast: boolean;
  isContinuousRecordingActive?: boolean;
  continuousRecordingTime?: number;
  recordingError?: string | null;
  canComplete?: boolean;
}

export const FeedbackCapture: React.FC<FeedbackCaptureProps> = ({
  mode,
  questionNumber,
  onResponse,
  onUserContentCompleted,
  highContrast,
  isContinuousRecordingActive = false,
  continuousRecordingTime = 0,
  recordingError = null,
  canComplete = true
}) => {
  // Video recording state
  const webcamRef = useRef<Webcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isWebcamReady, setIsWebcamReady] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);

  // Audio recording state
  const audioMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedAudioChunksRef = useRef<Blob[]>([]);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [audioRecordingTime, setAudioRecordingTime] = useState(0);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Text response state
  const [textResponse, setTextResponse] = useState('');
  const [starRating, setStarRating] = useState(0);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasProvidedResponse, setHasProvidedResponse] = useState(false);

  // Reset state when question number changes
  React.useEffect(() => {
    setRecordingBlob(null);
    recordedChunksRef.current = [];
    setRecordingTime(0);
    setRecordedAudioBlob(null);
    recordedAudioChunksRef.current = [];
    setAudioRecordingTime(0);
    setTextResponse('');
    setStarRating(0);
    setError(null);
    setIsSubmitting(false);
    setHasProvidedResponse(false);
  }, [questionNumber]);

  // Request audio access when audio mode is selected
  React.useEffect(() => {
    if (mode === 'audio' && !audioStream) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          setAudioStream(stream);
          setAudioError(null);
        })
        .catch(error => {
          console.error('Audio access error:', error);
          let errorMessage = 'Unable to access microphone';
          if (error.name === 'NotAllowedError') {
            errorMessage = 'Microphone permission denied. Please allow microphone access and refresh the page.';
          } else if (error.name === 'NotFoundError') {
            errorMessage = 'No microphone found. Please connect a microphone and refresh the page.';
          } else if (error.name === 'NotReadableError') {
            errorMessage = 'Microphone is being used by another application. Please close other applications and refresh.';
          }
          setAudioError(errorMessage);
        });
    }

    return () => {
      if (audioStream && mode !== 'audio') {
        audioStream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
      }
    };
  }, [mode, audioStream]);

  // Audio recording timer
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecordingAudio) {
      interval = setInterval(() => {
        setAudioRecordingTime(prev => {
          if (prev >= 180) { // 3 minutes limit
            handleStopAudioRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setAudioRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecordingAudio]);

  // Check for supported MIME types
  const getSupportedMimeType = (mediaType: 'video' | 'audio' = 'video') => {
    const types = mediaType === 'video' 
      ? ['video/webm', 'video/webm;codecs=vp8', 'video/webm;codecs=vp9', 'video/mp4']
      : ['audio/webm', 'audio/webm;codecs=opus', 'audio/mp4', 'audio/mpeg'];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return mediaType === 'video' ? 'video/webm' : 'audio/webm'; // fallback
  };

  // Recording timer
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 180) { // 3 minutes limit
            handleStopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleWebcamReady = useCallback((stream: MediaStream) => {
    console.log('Webcam ready:', stream);
    setIsWebcamReady(true);
    setWebcamError(null);
  }, []);

  const handleWebcamError = useCallback((error: string | DOMException) => {
    console.error('Webcam error:', error);
    setIsWebcamReady(false);
    
    let errorMessage = 'Unable to access camera';
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error.name === 'NotAllowedError') {
      errorMessage = 'Camera permission denied. Please allow camera access and refresh the page.';
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'No camera found. Please connect a camera and refresh the page.';
    } else if (error.name === 'NotReadableError') {
      errorMessage = 'Camera is being used by another application. Please close other applications and refresh.';
    }
    
    setWebcamError(errorMessage);
  }, []);
/* const getVideoDuration = (blob: Blob): Promise<number> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const video = document.createElement('video');

    video.preload = 'metadata';
    video.src = url;
    console.log('getVideoDuration',video.duration)
    video.onloadedmetadata = () => {
      if (video.duration === Infinity) {
        // Seek trick to force duration calculation
        video.currentTime = 1e101;
        video.ontimeupdate = () => {
          video.ontimeupdate = null;
              console.log('getVideoDuration - inside infinity ',video.duration)
          finalize(video.duration);
          
        };
      } else {
            console.log('getVideoDuration-outside infinity',video.duration)
        finalize(video.duration);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
          console.log('getVideoDuration--video onerror Failed to load video metadata')
      reject(new Error('Failed to load video metadata'));
    };

    const finalize = (duration: number) => {
      URL.revokeObjectURL(url);
      if (!isFinite(duration) || duration <= 0) {
           console.log('getVideoDuration--reject duration',duration)
        reject(new Error('Invalid duration'));
      } else {
          console.log('getVideoDuration--resolve duration',duration)
        resolve(duration);
      }
    };
  });
};
*/
  const handleStartRecording = useCallback(() => {
    if (!webcamRef.current?.stream) {
      setError('No camera stream available');
      return;
    }

    const supportedMimeType = getSupportedMimeType('video');
    const mediaRecorder = new MediaRecorder(webcamRef.current.stream, {
      mimeType: supportedMimeType
    });

    mediaRecorderRef.current = mediaRecorder;
    recordedChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunksRef.current, { type: supportedMimeType });
      console.log('Recording stopped. Blob size:', blob.size, 'bytes');
      
      try {
        const durationCheck = await checkDurationLimit(blob, undefined, 'video');
        if (!durationCheck.isValid) {
          setError(durationCheck.error || 'Recording validation failed');
          return;
        }
      } catch (validationError) {
        console.error('Duration validation error:', validationError);
        setError('Unable to validate recording. Please try recording again.');
        return;
      }
      
      setRecordingBlob(blob);
    };

    mediaRecorder.start();
    setIsRecording(true);
    setError(null);
  }, []);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const handleStartAudioRecording = useCallback(() => {
    if (!audioStream) {
      setError('No microphone stream available');
      return;
    }

    const supportedMimeType = getSupportedMimeType('audio');
    const mediaRecorder = new MediaRecorder(audioStream, {
      mimeType: supportedMimeType
    });

    audioMediaRecorderRef.current = mediaRecorder;
    recordedAudioChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedAudioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedAudioChunksRef.current, { type: supportedMimeType });
      console.log('Audio recording stopped. Blob size:', blob.size, 'bytes');
      
      try {
        const durationCheck = await checkDurationLimit(blob, undefined, 'audio');
        if (!durationCheck.isValid) {
          setError(durationCheck.error || 'Recording validation failed');
          return;
        }
      } catch (validationError) {
        console.error('Audio duration validation error:', validationError);
        setError('Unable to validate recording. Please try recording again.');
        return;
      }
      
      setRecordedAudioBlob(blob);
    };

    mediaRecorder.start();
    setIsRecordingAudio(true);
    setError(null);
  }, [audioStream]);

  const handleStopAudioRecording = useCallback(() => {
    if (audioMediaRecorderRef.current) {
      audioMediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
    }
  }, []);

  const handleDeleteAudioRecording = () => {
    setRecordedAudioBlob(null);
    recordedAudioChunksRef.current = [];
    setAudioRecordingTime(0);
  };

  const handleDeleteRecording = () => {
    setRecordingBlob(null);
    recordedChunksRef.current = [];
    setRecordingTime(0);
    setHasProvidedResponse(false);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      let response: FeedbackResponse;

      if (mode === 'video') {
        // For continuous recording, we don't need a media blob here
        response = {
          id: crypto.randomUUID(),
          questionNumber,
          mode: 'video',
          timestamp: new Date()
        };
      } else if (mode === 'audio') {
        // For continuous recording, we don't need a media blob here
        response = {
          id: crypto.randomUUID(),
          questionNumber,
          mode: 'audio',
          timestamp: new Date()
        };
      } else {
        const validation = validateTextInput(textResponse);
        if (!validation.isValid) {
          setError(validation.error || 'Invalid text response');
          return;
        }

        if (starRating === 0) {
          setError('Please provide a star rating');
          return;
        }

        response = {
          id: crypto.randomUUID(),
          questionNumber,
          mode: 'text',
          textResponse,
          starRating,
          timestamp: new Date()
        };
      }

      onResponse(response);
    } catch (err) {
      setError('Failed to submit response. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h3 className={`text-xl font-semibold mb-2 ${highContrast ? 'text-white' : 'text-gray-800'}`}>
          Question {questionNumber}
        </h3>
        <p className={`text-sm ${highContrast ? 'text-gray-300' : 'text-gray-600'}`}>
          Please provide your response
        </p>
      </div>

      {/* Video Recording Mode */}
      {mode === 'video' && (
        <div className="space-y-4">
          {/* Continuous Recording Status */}
          <div className={`p-6 rounded-lg text-center ${
            highContrast ? 'bg-gray-800' : 'bg-gray-50'
          }`}>
            <Video size={48} className={`mx-auto mb-4 ${
              isContinuousRecordingActive 
                ? 'text-red-500' 
                : highContrast ? 'text-gray-400' : 'text-gray-500'
            }`} />
            
            {isContinuousRecordingActive && (
              <div className="mb-4">
                <div className={`text-lg font-bold mb-2 ${
                  highContrast ? 'text-red-300' : 'text-red-600'
                }`}>
                  Recording in Progress... {formatTime(continuousRecordingTime)}
                </div>
                <div className={`text-sm ${
                  highContrast ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Your responses are being recorded continuously
                </div>
              </div>
            )}
            
            {!isContinuousRecordingActive && (
              <div className="mb-4">
                <p className={`text-lg font-medium mb-2 ${
                  highContrast ? 'text-white' : 'text-gray-700'
                }`}>
                  Video Recording Ready
                </p>
                <p className={`text-sm ${
                  highContrast ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Recording will start automatically when you begin
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audio Recording Mode */}
      {mode === 'audio' && (
        <div className="space-y-4">
          {/* Continuous Recording Status */}
          <div className={`p-6 rounded-lg text-center ${
            highContrast ? 'bg-gray-800' : 'bg-gray-50'
          }`}>
            <Mic size={48} className={`mx-auto mb-4 ${
              isContinuousRecordingActive 
                ? 'text-red-500' 
                : highContrast ? 'text-gray-400' : 'text-gray-500'
            }`} />
            
            {isContinuousRecordingActive && (
              <div className="mb-4">
                <div className={`text-lg font-bold mb-2 ${
                  highContrast ? 'text-red-300' : 'text-red-600'
                }`}>
                  Recording in Progress... {formatTime(continuousRecordingTime)}
                </div>
                <div className={`text-sm ${
                  highContrast ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Your responses are being recorded continuously
                </div>
              </div>
            )}
            
            {!isContinuousRecordingActive && (
              <div className="mb-4">
                <p className={`text-lg font-medium mb-2 ${
                  highContrast ? 'text-white' : 'text-gray-700'
                }`}>
                  Audio Recording Ready
                </p>
                <p className={`text-sm ${
                  highContrast ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Recording will start automatically when you begin
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Text Response Mode */}
      {mode === 'text' && (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="text-response"
              className={`block text-sm font-medium mb-2 ${highContrast ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Your Response (max 500 characters)
            </label>
            <textarea
              id="text-response"
              value={textResponse}
              onChange={(e) => setTextResponse(e.target.value)}
              maxLength={500}
              rows={4}
              className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-4 focus:ring-opacity-50 ${
                highContrast
                  ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-400 focus:ring-blue-400'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500'
              }`}
              placeholder="Share your thoughts about our food truck..."
              aria-describedby="char-count"
            />
            <p
              id="char-count"
              className={`text-sm mt-1 ${highContrast ? 'text-gray-400' : 'text-gray-500'}`}
            >
              {textResponse.length}/500 characters
            </p>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-3 ${highContrast ? 'text-gray-300' : 'text-gray-700'}`}>
              Rate Your Experience
            </label>
            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <motion.button
                  key={rating}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setStarRating(rating)}
                  className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-opacity-50 ${
                    starRating >= rating
                      ? 'text-yellow-500'
                      : highContrast
                        ? 'text-gray-600 hover:text-yellow-400'
                        : 'text-gray-300 hover:text-yellow-400'
                  } ${highContrast ? 'focus:ring-yellow-400' : 'focus:ring-yellow-500'}`}
                  aria-label={`Rate ${rating} star${rating !== 1 ? 's' : ''}`}
                >
                  <Star size={32} fill={starRating >= rating ? 'currentColor' : 'none'} />
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`flex items-center space-x-2 p-4 rounded-lg ${
              highContrast ? 'bg-red-900 text-red-300' : 'bg-red-50 text-red-800'
            }`}
            role="alert"
          >
            <AlertCircle size={20} />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSubmit}
        disabled={isSubmitting}
        className={`w-full flex items-center justify-center space-x-2 px-6 py-4 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed ${
          highContrast
            ? 'bg-green-700 text-white hover:bg-green-600 focus:ring-green-400'
            : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
        }`}
        aria-label={questionNumber === 5 ? "Complete feedback" : "Continue to next question"}
      >
        {isSubmitting ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
          />
        ) : (
          <>
            <CheckCircle size={20} />
            <span>{questionNumber === 5 ? 'Complete' : 'Continue'}</span>
          </>
        )}
      </motion.button>
    </motion.div>
  );
};