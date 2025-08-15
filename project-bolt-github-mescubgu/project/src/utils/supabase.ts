import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to upload media files to Supabase Storage
export const uploadMediaFile = async (
  file: Blob,
  fileName: string,
  bucket: string = 'feedback-media'
): Promise<{ data: { publicUrl: string } | null; error: any }> => {
  try {
    const fileExtension = fileName.split('.').pop() || 'mp4';
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}_${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(uniqueFileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Storage upload error:', error);
      
      return { data: null, error };
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(uniqueFileName);

    return { data: { publicUrl: publicUrlData.publicUrl }, error: null };
  } catch (err) {
    console.error('Upload error:', err);
    return { data: null, error: err };
  }
};