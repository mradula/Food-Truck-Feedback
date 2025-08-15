import sanitizeHtml from 'sanitize-html';

export const BANNED_WORDS = [
  'inappropriate',
  'offensive',
  'spam',
];

export const validateTextInput = (text: string): { isValid: boolean; error?: string } => {
  if (!text || text.trim().length === 0) {
    return { isValid: false, error: 'Please provide a response' };
  }

  if (text.length > 500) {
    return { isValid: false, error: 'Response must be 500 characters or less' };
  }

  const sanitized = sanitizeHtml(text, {
    allowedTags: [],
    allowedAttributes: {},
  });

  const lowerText = sanitized.toLowerCase();
  const containsBannedWord = BANNED_WORDS.some(word => lowerText.includes(word));

  if (containsBannedWord) {
    return {
      isValid: false,
      error: 'We cannot accept this kind of response. Please try again.',
    };
  }

  return { isValid: true };
};

export const validateMediaFile = (
  file: File,
  type: 'video' | 'audio'
): { isValid: boolean; error?: string } => {
  const maxSize = type === 'video' ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB or 10MB
  const allowedTypes =
    type === 'video'
      ? ['video/mp4', 'video/mov', 'video/quicktime', 'video/webm', 'video/ogg']
      : ['audio/mp3', 'audio/wav', 'audio/mpeg'];

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size must be less than ${type === 'video' ? '50MB' : '10MB'}`,
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid file type. Please use: ${allowedTypes.join(', ')}`,
    };
  }

  return { isValid: true };
};

export const checkDurationLimit = async (
  blob: Blob,
  recordingDuration?: number,
  type: 'video' | 'audio' = 'video'
): Promise<{ isValid: boolean; error?: string }> => {
  return new Promise((resolve, reject) => {
    try {
      const url = URL.createObjectURL(blob);
      const media = type === 'video' 
        ? document.createElement('video') as HTMLVideoElement
        : document.createElement('audio') as HTMLAudioElement;

      media.preload = 'metadata';
      if (type === 'video') {
        (media as HTMLVideoElement).muted = true;
      }
      media.src = url;

      let callbackFired = false;

      media.onloadedmetadata = () => {
        callbackFired = true;

        if (media.duration === Infinity) {
          // Use a seek trick to calculate duration
          media.currentTime = 1e101;
          media.ontimeupdate = () => {
            media.ontimeupdate = null;
            const duration = media.duration;
            URL.revokeObjectURL(url);

            if (!isFinite(duration) || duration <= 0) {
              resolve({
                isValid: false,
                error: 'Could not determine recording duration. Please try again.',
              });
              return;
            }

            if (duration > 180) {
              resolve({
                isValid: false,
                error: 'Recording must be 3 minutes or less',
              });
            } else {
              resolve({ isValid: true });
            }
          };
        } else {
          const duration = media.duration;
          URL.revokeObjectURL(url);

          if (!isFinite(duration) || duration <= 0) {
            resolve({
              isValid: false,
              error: 'Could not determine recording duration. Please try again.',
            });
            return;
          }

          if (duration > 180) {
            resolve({
              isValid: false,
              error: 'Recording must be 3 minutes or less',
            });
          } else {
            resolve({ isValid: true });
          }
        }
      };

      media.onerror = () => {
        callbackFired = true;
        URL.revokeObjectURL(url);
        resolve({ isValid: false, error: 'Unable to validate recording duration' });
      };

      setTimeout(() => {
        if (!callbackFired) {
          URL.revokeObjectURL(url);
          resolve({ isValid: false, error: 'Timeout validating recording duration' });
        }
      }, 10000);

      media.load();
    } catch (err) {
      reject(
        new Error(
          'Failed to process video file: ' +
            (err instanceof Error ? err.message : 'Unknown error')
        )
      );
    }
  });
};
