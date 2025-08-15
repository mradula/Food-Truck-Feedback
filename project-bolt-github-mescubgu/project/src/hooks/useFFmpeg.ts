import { useState, useCallback, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export const useFFmpeg = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const ffmpegRef = useRef<FFmpeg | null>(null);

  const loadFFmpeg = useCallback(async () => {
    if (ffmpegRef.current && isReady) {
      return ffmpegRef.current;
    }

    setIsLoading(true);
    setError(null);
    setProgress(0);

    try {
      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;

      // Set up progress handler
      ffmpeg.on('progress', ({ progress: p }) => {
        setProgress(Math.round(p * 100));
      });

      ffmpeg.on('log', ({ message }) => {
        console.log('FFmpeg log:', message);
      });

      // Load FFmpeg with local core files
      // Try loading from local files first, fallback to CDN
      try {
        const baseURL = '/ffmpeg-core';
        await ffmpeg.load({
          //coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          //wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          corePath: '/ffmpeg-core.js',
        });
        console.log('FFmpeg loaded from local files');
      } catch (localError) {
        console.warn('Failed to load local FFmpeg files, trying CDN:', localError);
        // Fallback to CDN
        await ffmpeg.load({
          coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.js',
          wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.wasm',
        });
        console.log('FFmpeg loaded from CDN');
      }

      setIsReady(true);
      console.log('FFmpeg loaded successfully');
      return ffmpeg;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load FFmpeg';
      console.error('FFmpeg loading error:', err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isReady]);

  const concatenateVideos = useCallback(async (
    videoBlobs: Blob[],
    outputFileName: string = 'output.mp4'
  ): Promise<Blob> => {
    if (!ffmpegRef.current || !isReady) {
      await loadFFmpeg();
    }

    const ffmpeg = ffmpegRef.current!;
    setProgress(0);
    setError(null);

    try {
      console.log(`Starting video concatenation of ${videoBlobs.length} videos`);

      // Write input files to FFmpeg's virtual file system
      const inputFiles: string[] = [];
      for (let i = 0; i < videoBlobs.length; i++) {
        const inputFileName = `input${i}.mp4`;
        await ffmpeg.writeFile(inputFileName, await fetchFile(videoBlobs[i]));
        inputFiles.push(inputFileName);
        console.log(`Written ${inputFileName} (${videoBlobs[i].size} bytes)`);
      }

      // Create concat list file
      const concatList = inputFiles.map(file => `file '${file}'`).join('\n');
      await ffmpeg.writeFile('concat_list.txt', concatList);

      // Execute FFmpeg concatenation command
      console.log('Executing FFmpeg concatenation...');
      await ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'concat_list.txt',
        '-c', 'copy',
        '-avoid_negative_ts', 'make_zero',
        outputFileName
      ]);

      // Read the output file
      const outputData = await ffmpeg.readFile(outputFileName);
      const outputBlob = new Blob([outputData], { type: 'video/mp4' });

      console.log(`Concatenation complete. Output size: ${outputBlob.size} bytes`);

      // Clean up files from virtual file system
      for (const inputFile of inputFiles) {
        try {
          await ffmpeg.deleteFile(inputFile);
        } catch (e) {
          console.warn(`Failed to delete ${inputFile}:`, e);
        }
      }
      try {
        await ffmpeg.deleteFile('concat_list.txt');
        await ffmpeg.deleteFile(outputFileName);
      } catch (e) {
        console.warn('Failed to delete temporary files:', e);
      }

      setProgress(100);
      return outputBlob;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Video concatenation failed';
      console.error('Concatenation error:', err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [isReady, loadFFmpeg]);

  const createVideoFromAudioAndImage = useCallback(async (
    audioBlob: Blob,
    imageBlob: Blob,
    duration: number,
    outputFileName: string = 'audio_video.mp4'
  ): Promise<Blob> => {
    if (!ffmpegRef.current || !isReady) {
      await loadFFmpeg();
    }

    const ffmpeg = ffmpegRef.current!;
    setProgress(0);
    setError(null);

    try {
      console.log(`Creating video from audio (${audioBlob.size} bytes) and image (${imageBlob.size} bytes)`);

      // Write input files
      await ffmpeg.writeFile('input_audio.webm', await fetchFile(audioBlob));
      await ffmpeg.writeFile('input_image.png', await fetchFile(imageBlob));

      // Create video from audio and static image
      console.log('Executing FFmpeg audio-to-video conversion...');
      await ffmpeg.exec([
        '-loop', '1',
        '-i', 'input_image.png',
        '-i', 'input_audio.webm',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-pix_fmt', 'yuv420p',
        '-shortest',
        '-t', duration.toString(),
        '-movflags', '+faststart',
        outputFileName
      ]);

      // Read the output file
      const outputData = await ffmpeg.readFile(outputFileName);
      const outputBlob = new Blob([outputData], { type: 'video/mp4' });

      console.log(`Audio-to-video conversion complete. Output size: ${outputBlob.size} bytes`);

      // Clean up
      try {
        await ffmpeg.deleteFile('input_audio.webm');
        await ffmpeg.deleteFile('input_image.png');
        await ffmpeg.deleteFile(outputFileName);
      } catch (e) {
        console.warn('Failed to delete temporary files:', e);
      }

      setProgress(100);
      return outputBlob;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Audio-to-video conversion failed';
      console.error('Audio-to-video conversion error:', err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [isReady, loadFFmpeg]);

  return {
    loadFFmpeg,
    concatenateVideos,
    createVideoFromAudioAndImage,
    isLoading,
    isReady,
    progress,
    error
  };
};