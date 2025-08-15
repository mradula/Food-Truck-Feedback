import { useState, useCallback } from 'react';
import { supabase, uploadMediaFile } from '../utils/supabase';
import { FeedbackResponse } from '../types';
import { checkDurationLimit } from '../utils/validation';

export const useSupabaseFeedback = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const createFeedbackSession = useCallback(async (
    consent: boolean,
    selectedMode: 'video' | 'audio' | 'text'
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('feedback_sessions')
        .insert({
          consent,
          selected_mode: selectedMode,
          completed: false
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating feedback session:', error);
        setError('Failed to create feedback session');
        return null;
      }

      console.log('Created feedback session:', data.id);
      return data.id;
    } catch (err) {
      console.error('Session creation error:', err);
      setError('Failed to create feedback session');
      return null;
    }
  }, []);

  const saveFeedbackResponse = useCallback(async (
    sessionId: string,
    response: FeedbackResponse
  ): Promise<boolean> => {
    // For continuous recording modes, individual responses are not saved to database
    // Only text responses are saved individually
    if (response.mode === 'video' || response.mode === 'audio') {
      console.log(`Skipping individual ${response.mode} response save - using continuous recording`);
      return true;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      if (response.mode === 'text') {
        // Save text feedback
        const { error } = await supabase
          .from('text_feedback')
          .insert({
            session_id: sessionId,
            question_number: response.questionNumber,
            text_response: response.textResponse!,
            star_rating: response.starRating!
          });

        if (error) {
          console.error('Error saving text feedback:', error);
          setError('Failed to save text feedback');
          return false;
        }

        console.log('Saved text feedback for question', response.questionNumber);
        return true;

      } else if (response.mode === 'audio' || response.mode === 'video') {
        if (!response.mediaBlob) {
          setError('No media file to upload');
          return false;
        }

        // Get duration for the media file
        let duration: number | undefined;
        try {
          const durationCheck = await checkDurationLimit(response.mediaBlob, undefined, response.mode);
          if (durationCheck.isValid) {
            // Extract duration from the blob (this is a simplified approach)
            duration = await getMediaDuration(response.mediaBlob, response.mode);
          }
        } catch (err) {
          console.warn('Could not determine media duration:', err);
        }

        // Upload media file to Supabase Storage
        const fileName = `${response.mode}_q${response.questionNumber}_${Date.now()}.${response.mode === 'video' ? 'mp4' : 'webm'}`;
        
        setUploadProgress(25);
        const uploadResult = await uploadMediaFile(response.mediaBlob, fileName);
        
        if (uploadResult.error || !uploadResult.data) {
          console.error('Upload error:', uploadResult.error);
          setError('Failed to upload media file');
          return false;
        }

        setUploadProgress(75);

        const table = response.mode === 'audio' ? 'audio_feedback' : 'video_feedback';
        const { error } = await supabase
          .from(table)
          .insert({
            session_id: sessionId,
            question_number: response.questionNumber,
            storage_url: uploadResult.data.publicUrl,
            file_size: response.mediaBlob.size,
            duration: duration
          });

        if (error) {
          console.error(`Error saving ${response.mode} feedback:`, error);
          setError(`Failed to save ${response.mode} feedback`);
          return false;
        }

        setUploadProgress(100);
        console.log(`Saved ${response.mode} feedback for question`, response.questionNumber);
        return true;
      }

      return false;
    } catch (err) {
      console.error('Save feedback error:', err);
      setError('Failed to save feedback response');
      return false;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, []);

  const saveContinuousMediaFeedback = useCallback(async (
    sessionId: string,
    mode: 'video' | 'audio',
    driveFileId: string,
    fileSize: number,
    duration: number
  ): Promise<boolean> => {
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const table = mode === 'audio' ? 'audio_feedback' : 'video_feedback';
      const { error } = await supabase
        .from(table)
        .insert({
          session_id: sessionId,
          question_number: null, // NULL for continuous recording
          storage_url: driveFileId, // Store Google Drive file ID
          file_size: fileSize,
          duration: duration
        });

      if (error) {
        console.error(`Error saving continuous ${mode} feedback:`, error);
        setError(`Failed to save continuous ${mode} feedback`);
        return false;
      }

      setUploadProgress(100);
      console.log(`Saved continuous ${mode} feedback for session`, sessionId);
      return true;
    } catch (err) {
      console.error('Save continuous feedback error:', err);
      setError('Failed to save continuous feedback');
      return false;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, []);

  const updateSessionCompletion = useCallback(async (
    sessionId: string,
    driveFileId?: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('feedback_sessions')
        .update({
          completed: true,
          drive_file_id: driveFileId,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) {
        console.error('Error updating session completion:', error);
        setError('Failed to update session');
        return false;
      }

      console.log('Updated session completion:', sessionId);
      return true;
    } catch (err) {
      console.error('Session update error:', err);
      setError('Failed to update session');
      return false;
    }
  }, []);

  return {
    createFeedbackSession,
    saveFeedbackResponse,
    saveContinuousMediaFeedback,
    updateSessionCompletion,
    isUploading,
    uploadProgress,
    error
  };
};

// Helper function to get media duration
const getMediaDuration = (blob: Blob, type: 'video' | 'audio'): Promise<number> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const media = type === 'video' 
      ? document.createElement('video') as HTMLVideoElement
      : document.createElement('audio') as HTMLAudioElement;

    media.preload = 'metadata';
    if (type === 'video') {
      (media as HTMLVideoElement).muted = true;
    }
    media.src = url;

    const cleanup = () => {
      URL.revokeObjectURL(url);
    };

    media.onloadedmetadata = () => {
      let duration = media.duration;
      
      if (duration === Infinity) {
        // Seek trick to get duration
        media.currentTime = 1e101;
        media.ontimeupdate = () => {
          media.ontimeupdate = null;
          duration = media.duration;
          cleanup();
          
          if (isFinite(duration) && duration > 0) {
            resolve(duration);
          } else {
            reject(new Error('Invalid duration'));
          }
        };
      } else {
        cleanup();
        
        if (isFinite(duration) && duration > 0) {
          resolve(duration);
        } else {
          reject(new Error('Invalid duration'));
        }
      }
    };

    media.onerror = () => {
      cleanup();
      reject(new Error('Failed to load media'));
    };

    // Timeout after 10 seconds
    setTimeout(() => {
      cleanup();
      reject(new Error('Timeout getting duration'));
    }, 10000);

    media.load();
  });
};