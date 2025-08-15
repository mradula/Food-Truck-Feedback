import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Folder, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useGoogleDrive } from '../hooks/useGoogleDrive';

interface SessionUploaderProps {
  sessionId: string;
  hasConsent: boolean;
  onUploadComplete?: (result: any) => void;
  highContrast?: boolean;
}

export const SessionUploader: React.FC<SessionUploaderProps> = ({
  sessionId,
  hasConsent,
  onUploadComplete,
  highContrast = false
}) => {
  const { uploadSessionResponsesToDrive, isUploading, uploadProgress, gapiReady } = useGoogleDrive();
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUploadSession = async () => {
    setError(null);
    setUploadResult(null);
    
    try {
      const result = await uploadSessionResponsesToDrive(sessionId, hasConsent);
      setUploadResult(result);
      onUploadComplete?.(result);
      
      if (!result.success) {
        setError(result.errors.join(', ') || 'Upload failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload session';
      setError(errorMessage);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className={`p-6 rounded-lg ${highContrast ? 'bg-gray-800 border-2 border-gray-600' : 'bg-white shadow-lg'}`}>
        <div className="flex items-center space-x-3 mb-4">
          <Folder size={24} className={highContrast ? 'text-blue-300' : 'text-blue-600'} />
          <h3 className={`text-lg font-semibold ${highContrast ? 'text-white' : 'text-gray-800'}`}>
            Upload Session to Google Drive
          </h3>
        </div>
        
        <p className={`text-sm mb-4 ${highContrast ? 'text-gray-300' : 'text-gray-600'}`}>
          Session ID: <code className={`px-2 py-1 rounded ${highContrast ? 'bg-gray-700' : 'bg-gray-100'}`}>
            {sessionId.slice(0, 8)}...
          </code>
        </p>
        
        <p className={`text-sm mb-6 ${highContrast ? 'text-gray-300' : 'text-gray-600'}`}>
          This will download all audio and video responses from this session and upload them to Google Drive 
          in an organized folder structure.
        </p>

        {/* Upload Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleUploadSession}
          disabled={!gapiReady || isUploading}
          className={`w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed ${
            highContrast
              ? 'bg-blue-700 text-white hover:bg-blue-600 focus:ring-blue-400'
              : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
          }`}
        >
          {isUploading ? (
            <>
              <Loader size={20} className="animate-spin" />
              <span>Uploading... {uploadProgress}%</span>
            </>
          ) : !gapiReady ? (
            <>
              <Loader size={20} className="animate-spin" />
              <span>Connecting to Google Drive...</span>
            </>
          ) : (
            <>
              <Upload size={20} />
              <span>Upload Session to Google Drive</span>
            </>
          )}
        </motion.button>

        {/* Progress Bar */}
        {isUploading && (
          <div className={`mt-4 w-full h-2 rounded-full overflow-hidden ${
            highContrast ? 'bg-gray-700' : 'bg-gray-200'
          }`}>
            <motion.div
              className={`h-full rounded-full ${
                highContrast ? 'bg-blue-500' : 'bg-blue-600'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${uploadProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}

        {/* Results */}
        {uploadResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-4 p-4 rounded-lg ${
              uploadResult.success
                ? highContrast ? 'bg-green-900 text-green-300' : 'bg-green-50 text-green-800'
                : highContrast ? 'bg-red-900 text-red-300' : 'bg-red-50 text-red-800'
            }`}
          >
            <div className="flex items-center space-x-2 mb-2">
              {uploadResult.success ? (
                <CheckCircle size={20} />
              ) : (
                <AlertCircle size={20} />
              )}
              <span className="font-medium">
                {uploadResult.success ? 'Upload Complete!' : 'Upload Issues'}
              </span>
            </div>
            
            {uploadResult.uploadedFiles.length > 0 && (
              <div className="mb-2">
                <p className="text-sm font-medium">Uploaded files ({uploadResult.uploadedFiles.length}):</p>
                <ul className="text-xs mt-1 space-y-1">
                  {uploadResult.uploadedFiles.map((file: string, index: number) => (
                    <li key={index} className="flex items-center space-x-1">
                      <CheckCircle size={12} />
                      <span>{file}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {uploadResult.errors.length > 0 && (
              <div>
                <p className="text-sm font-medium">Errors ({uploadResult.errors.length}):</p>
                <ul className="text-xs mt-1 space-y-1">
                  {uploadResult.errors.map((error: string, index: number) => (
                    <li key={index} className="flex items-center space-x-1">
                      <AlertCircle size={12} />
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {uploadResult.folderId && (
              <p className="text-xs mt-2">
                Folder ID: <code>{uploadResult.folderId}</code>
              </p>
            )}
          </motion.div>
        )}

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-4 p-4 rounded-lg ${
              highContrast ? 'bg-red-900 text-red-300' : 'bg-red-50 text-red-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              <AlertCircle size={20} />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-sm mt-1">{error}</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};