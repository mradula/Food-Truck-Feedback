import { VideoConfig } from '../types';

// Construct Supabase storage URL for videos
const getSupabaseVideoUrl = (filename: string): string => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  console.log('Supabase URL:', supabaseUrl);
  console.log('Video filename:', filename);
  if (!supabaseUrl) {
    console.warn('VITE_SUPABASE_URL not configured, falling back to local videos');
    return `/videos/${filename}`;
  }
  const videoUrl = `${supabaseUrl}/storage/v1/object/public/feedback_videos/${filename}`;
  console.log('Generated video URL:', videoUrl);
  return videoUrl;
};

export const VIDEO_CONFIG: VideoConfig = {
  welcome: getSupabaseVideoUrl('welcome.mp4'),
  questions: [
    getSupabaseVideoUrl('question1.mp4'),
    getSupabaseVideoUrl('question2.mp4'),
    getSupabaseVideoUrl('question3.mp4'),
    getSupabaseVideoUrl('question4.mp4'),
    getSupabaseVideoUrl('question5.mp4')
  ],
  closing: getSupabaseVideoUrl('closing.mp4')
};

export const GOOGLE_DRIVE_CONFIG = {
  socialFolderId: '1k4jPsv4eAt6Z2_n4x0VbI9rN__y3F5Ww',
  privateFolderId: '1dHOcDinpyaFfOF7JoXn4zQV1BcUr5NC5',
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY
};