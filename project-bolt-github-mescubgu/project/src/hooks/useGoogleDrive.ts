import { useState, useCallback, useEffect, useRef } from 'react';
import { GOOGLE_DRIVE_CONFIG } from '../config/videos';
import { uploadFileResumable } from '../utils/googleDriveUploader';

interface UploadResult {
  fileId: string;
  success: boolean;
  error?: string;
}

// Extend the Window interface to include Google Identity Services
declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => any;
        };
      };
    };
    gapi: any;
  }
}

export const useGoogleDrive = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [gapiReady, setGapiReady] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  
  const tokenClientRef = useRef<any>(null);

  // Initialize Google Identity Services
  useEffect(() => {
    const initializeGIS = () => {
      if (typeof window.google === 'undefined' || !window.google.accounts) {
        console.log('Google Identity Services not yet loaded, waiting...');
        setTimeout(initializeGIS, 100);
        return;
      }

      try {
        console.log('Initializing Google Identity Services...');
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_DRIVE_CONFIG.clientId,
          scope: 'https://www.googleapis.com/auth/drive.file',
          callback: (tokenResponse: any) => {
            console.log('Token response received:', tokenResponse);
            if (tokenResponse.access_token) {
              setAccessToken(tokenResponse.access_token);
            } else {
              console.error('No access token in response:', tokenResponse);
            }
          },
          error_callback: (error: any) => {
            console.error('GIS token error:', error);
            setAccessToken(null);
          }
        });
        
        setGisReady(true);
        console.log('Google Identity Services initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Google Identity Services:', error);
      }
    };

    initializeGIS();
  }, []);

  // Initialize Google API client
  useEffect(() => {
    const loadGoogleApiAndModules = () => {
      if (typeof window.gapi === 'undefined') {
        console.log('window.gapi is undefined. Waiting for gapi.js to load...');
        const checkGapiInterval = setInterval(() => {
          if (typeof window.gapi !== 'undefined') {
            clearInterval(checkGapiInterval);
            console.log('window.gapi is now defined. Loading modules...');
            loadGapiModules();
          }
        }, 100);
        return;
      }

      loadGapiModules();
    };

    const loadGapiModules = () => {
      window.gapi.load('client', {
        callback: async () => {
          console.log('gapi.load callback fired. client module ready.');
          try {
            await window.gapi.client.init({
              apiKey: GOOGLE_DRIVE_CONFIG.apiKey,
              discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
            });
            console.log('GAPI client initialized successfully');
            setGapiReady(true);
          } catch (error) {
            console.error('Failed to initialize GAPI client:', error);
          }
        },
        onerror: (e: any) => {
          console.error('Failed to load gapi modules:', e);
        }
      });
    };

    loadGoogleApiAndModules();
  }, []);

  const authenticate = useCallback(async (): Promise<string> => {
    if (!gisReady || !tokenClientRef.current) {
      throw new Error('Google Identity Services not ready for authentication.');
    }
    
    return new Promise((resolve, reject) => {
      // Set up a one-time callback for this authentication request
      const originalCallback = tokenClientRef.current.callback;
      
      tokenClientRef.current.callback = (tokenResponse: any) => {
        // Restore original callback
        tokenClientRef.current.callback = originalCallback;
        
        if (tokenResponse.access_token) {
          console.log('Authentication successful, access token received');
          setAccessToken(tokenResponse.access_token);
          resolve(tokenResponse.access_token);
        } else if (tokenResponse.error) {
          console.error('Authentication failed:', tokenResponse.error);
          reject(new Error(`Authentication failed: ${tokenResponse.error}`));
        } else {
          console.error('Authentication failed: No access token received');
          reject(new Error('Authentication failed: No access token received'));
        }
      };

      // Request access token
      try {
        console.log('Requesting access token...');
        tokenClientRef.current.requestAccessToken();
      } catch (error) {
        // Restore original callback on error
        tokenClientRef.current.callback = originalCallback;
        console.error('Failed to request access token:', error);
        reject(new Error(`Failed to request access token: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
  }, [gisReady]);

  const uploadToGoogleDrive = useCallback(async (
    videoBlob: Blob,
    baseFilename: string,
    hasConsent: boolean
  ): Promise<UploadResult> => {
    if (!gapiReady || !gisReady) {
      return { fileId: '', success: false, error: 'Google services not ready' };
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Get access token (authenticate if needed)
      let currentAccessToken = accessToken;
      if (!currentAccessToken) {
        console.log('No access token available, authenticating...');
        currentAccessToken = await authenticate();
      }

      if (!currentAccessToken) {
        throw new Error('Authentication failed: No access token obtained.');
      }

      const folderId = hasConsent 
        ? GOOGLE_DRIVE_CONFIG.socialFolderId 
        : GOOGLE_DRIVE_CONFIG.privateFolderId;

      const fileExtension = videoBlob.type.split('/').pop() || 'bin';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${baseFilename}_${timestamp}.${fileExtension}`;
      
      console.log(`Starting upload: ${filename} (${videoBlob.size} bytes) to folder ${folderId}`);
      
      const fileId = await uploadFileResumable({
        file: videoBlob,
        fileName: filename,
        folderId: folderId,
        accessToken: currentAccessToken,
        onProgress: setUploadProgress,
        mimeType: videoBlob.type,
      });

      console.log('Upload successful, file ID:', fileId);
      return { fileId: fileId, success: true };

    } catch (error) {
      setIsUploading(false);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      console.error('Google Drive upload error:', error);
      
      // Clear access token if authentication failed
      if (errorMessage.includes('authentication') || errorMessage.includes('token')) {
        setAccessToken(null);
      }
      
      return { fileId: '', success: false, error: errorMessage };
    } finally {
      setIsUploading(false);
    }
  }, [authenticate, gapiReady, gisReady, accessToken]);

  return {
    uploadToGoogleDrive,
    isUploading,
    uploadProgress,
    gapiReady: gapiReady && gisReady
  };
};