/**
 * Google Drive Resumable Upload Utility
 * 
 * This module provides a robust file upload system for continuous video and audio recordings
 * to Google Drive using the resumable upload protocol. It handles large files efficiently
 * with chunk-based uploads, retry mechanisms, and progress tracking.
 */

interface UploadProgressCallback {
  (progress: number): void;
}

interface UploadOptions {
  file: Blob;
  fileName: string;
  folderId: string;
  accessToken: string;
  onProgress: UploadProgressCallback;
  mimeType: string;
}

interface UploadResult {
  fileId: string;
  success: boolean;
  error?: string;
}

/**
 * Uploads a file to Google Drive using the resumable upload protocol.
 * 
 * This function implements Google Drive's resumable upload API which is ideal for:
 * - Large files (video/audio recordings)
 * - Unreliable network connections
 * - Progress tracking requirements
 * 
 * The upload process consists of two phases:
 * 1. Initiation: Create an upload session and get a session URI
 * 2. Upload: Send file data in chunks to the session URI
 *
 * @param options - Configuration object containing file, metadata, and callbacks
 * @returns Promise that resolves with the Google Drive file ID upon successful upload
 * @throws Error if the upload fails after all retry attempts
 */
export const uploadFileResumable = async (options: UploadOptions): Promise<string> => {
  const { file, fileName, folderId, accessToken, onProgress, mimeType } = options;
  
  // Configuration constants
  const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable';
  const MAX_RETRIES = 5;
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks for optimal performance
  const RETRY_DELAY_BASE = 1000; // Base delay for exponential backoff (1 second)

  // File metadata for Google Drive
  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: mimeType,
    createdTime: new Date().toISOString(),
    modifiedTime: new Date().toISOString()
  };

  let retryCount = 0;

  /**
   * Phase 1: Initiate the resumable upload session
   * 
   * This sends a POST request to Google Drive API with file metadata
   * and receives a session URI for subsequent chunk uploads.
   */
  const initiateUpload = async (): Promise<string> => {
    console.log(`Initiating resumable upload for file: ${fileName} (${file.size} bytes)`);
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', UPLOAD_URL);
      
      // Set required headers for resumable upload initiation
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
      xhr.setRequestHeader('X-Upload-Content-Type', mimeType);
      xhr.setRequestHeader('X-Upload-Content-Length', file.size.toString());

      xhr.onload = () => {
        if (xhr.status === 200) {
          const location = xhr.getResponseHeader('Location');
          if (location) {
            console.log('Upload session initiated successfully');
            resolve(location);
          } else {
            reject(new Error('Failed to get upload session URI from response headers'));
          }
        } else {
          const errorMsg = `Failed to initiate upload: ${xhr.status} ${xhr.statusText}`;
          console.error(errorMsg);
          reject(new Error(errorMsg));
        }
      };

      xhr.onerror = () => {
        const errorMsg = 'Network error during upload initiation';
        console.error(errorMsg);
        reject(new Error(errorMsg));
      };

      xhr.ontimeout = () => {
        const errorMsg = 'Timeout during upload initiation';
        console.error(errorMsg);
        reject(new Error(errorMsg));
      };

      // Set timeout for initiation request (30 seconds)
      xhr.timeout = 30000;
      
      // Send metadata to initiate the session
      xhr.send(JSON.stringify(metadata));
    });
  };

  /**
   * Phase 2: Upload file chunks to the session URI
   * 
   * This function uploads the file in chunks, handling resume logic
   * and retry mechanisms for failed chunks.
   */
  const uploadChunks = async (sessionUri: string): Promise<string> => {
    let uploadedBytes = 0;
    let fileId: string | null = null;
    let chunkRetryCount = 0;

    console.log(`Starting chunk upload. Total size: ${file.size} bytes, Chunk size: ${CHUNK_SIZE} bytes`);

    while (uploadedBytes < file.size && chunkRetryCount < MAX_RETRIES) {
      try {
        // Calculate chunk boundaries
        const chunkStart = uploadedBytes;
        const chunkEnd = Math.min(uploadedBytes + CHUNK_SIZE, file.size) - 1;
        const chunk = file.slice(chunkStart, chunkEnd + 1);
        const contentRange = `bytes ${chunkStart}-${chunkEnd}/${file.size}`;

        console.log(`Uploading chunk: ${contentRange}`);

        const response = await new Promise<XMLHttpRequest>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', sessionUri);
          
          // Set headers for chunk upload
          xhr.setRequestHeader('Content-Range', contentRange);
          xhr.setRequestHeader('Content-Type', mimeType);
          
          // Set timeout for chunk upload (5 minutes for large chunks)
          xhr.timeout = 300000;

          xhr.onload = () => {
            if (xhr.status === 200 || xhr.status === 201) {
              // Upload complete
              console.log('Upload completed successfully');
              resolve(xhr);
            } else if (xhr.status === 308) {
              // Resume incomplete - more chunks needed
              console.log('Chunk uploaded, continuing...');
              resolve(xhr);
            } else {
              reject(new Error(`Chunk upload failed: ${xhr.status} ${xhr.statusText}`));
            }
          };

          xhr.onerror = () => reject(new Error('Network error during chunk upload'));
          xhr.ontimeout = () => reject(new Error('Timeout during chunk upload'));
          
          // Send the chunk data
          xhr.send(chunk);
        });

        // Handle response based on status
        if (response.status === 200 || response.status === 201) {
          // Upload complete - extract file ID
          try {
            const responseData = JSON.parse(response.responseText);
            fileId = responseData.id;
            uploadedBytes = file.size; // Mark as complete
            console.log(`Upload completed. File ID: ${fileId}`);
          } catch (parseError) {
            throw new Error('Failed to parse completion response');
          }
        } else if (response.status === 308) {
          // Resume incomplete - update uploaded bytes
          const rangeHeader = response.getResponseHeader('Range');
          if (rangeHeader) {
            // Parse range header: "bytes=0-1048575" -> get end position + 1
            const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d+)/);
            if (rangeMatch) {
              uploadedBytes = parseInt(rangeMatch[2]) + 1;
            } else {
              throw new Error('Invalid Range header format');
            }
          } else {
            // No range header - query upload status
            uploadedBytes = await queryUploadStatus(sessionUri, file.size);
          }
        }

        // Update progress
        const progressPercent = Math.min(100, Math.round((uploadedBytes / file.size) * 100));
        onProgress(progressPercent);
        
        // Reset retry count on successful chunk
        chunkRetryCount = 0;

      } catch (error) {
        chunkRetryCount++;
        console.error(`Chunk upload error (attempt ${chunkRetryCount}/${MAX_RETRIES}):`, error);
        
        if (chunkRetryCount >= MAX_RETRIES) {
          throw new Error(
            `Failed to upload file after ${MAX_RETRIES} retries: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }

        // Exponential backoff delay
        const delay = RETRY_DELAY_BASE * Math.pow(2, chunkRetryCount - 1);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));

        // Query current upload status before retrying
        try {
          uploadedBytes = await queryUploadStatus(sessionUri, file.size);
          console.log(`Resuming upload from byte ${uploadedBytes}`);
        } catch (statusError) {
          console.warn('Failed to query upload status, will retry from current position');
        }
      }
    }

    if (!fileId) {
      throw new Error('File ID not received after upload completion');
    }

    return fileId;
  };

  /**
   * Query the current upload status to determine resume position
   * 
   * This is used when a chunk upload fails and we need to determine
   * how much of the file has been successfully uploaded.
   */
  const queryUploadStatus = async (sessionUri: string, fileSize: number): Promise<number> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', sessionUri);
      xhr.setRequestHeader('Content-Range', `bytes */${fileSize}`);
      xhr.timeout = 30000;

      xhr.onload = () => {
        if (xhr.status === 308) {
          // Resume incomplete
          const rangeHeader = xhr.getResponseHeader('Range');
          if (rangeHeader) {
            const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d+)/);
            if (rangeMatch) {
              resolve(parseInt(rangeMatch[2]) + 1);
            } else {
              resolve(0); // Start from beginning if can't parse
            }
          } else {
            resolve(0); // No range header means start from beginning
          }
        } else if (xhr.status === 200 || xhr.status === 201) {
          // Upload already complete
          resolve(fileSize);
        } else {
          reject(new Error(`Failed to query upload status: ${xhr.status} ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during status query'));
      xhr.ontimeout = () => reject(new Error('Timeout during status query'));
      
      xhr.send();
    });
  };

  // Main execution flow
  try {
    console.log('Starting resumable upload process...');
    
    // Phase 1: Initiate upload session
    const sessionUri = await initiateUpload();
    
    // Phase 2: Upload file chunks
    const uploadedFileId = await uploadChunks(sessionUri);
    
    console.log('Resumable upload completed successfully');
    return uploadedFileId;
    
  } catch (error) {
    console.error('Resumable upload failed:', error);
    throw error;
  }
};

/**
 * Convenience wrapper function that matches the existing interface
 * 
 * @param videoBlob - The file blob to upload
 * @param filename - Base filename for the upload
 * @param hasConsent - Whether user consented to social media sharing
 * @param folderId - Google Drive folder ID for upload
 * @param accessToken - OAuth2 access token
 * @param onProgress - Progress callback function
 * @returns Promise resolving to upload result
 */
export const uploadToGoogleDriveResumable = async (
  videoBlob: Blob,
  filename: string,
  hasConsent: boolean,
  folderId: string,
  accessToken: string,
  onProgress: UploadProgressCallback
): Promise<UploadResult> => {
  try {
    // Generate unique filename with timestamp
    const fileExtension = videoBlob.type.split('/').pop() || 'bin';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uniqueFilename = `${filename}_${timestamp}.${fileExtension}`;

    const fileId = await uploadFileResumable({
      file: videoBlob,
      fileName: uniqueFilename,
      folderId: folderId,
      accessToken: accessToken,
      onProgress: onProgress,
      mimeType: videoBlob.type
    });

    return {
      fileId: fileId,
      success: true
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    console.error('Google Drive upload error:', error);
    
    return {
      fileId: '',
      success: false,
      error: errorMessage
    };
  }
};