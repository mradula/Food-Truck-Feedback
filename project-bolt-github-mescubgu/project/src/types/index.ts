export interface FeedbackResponse {
  id: string;
  questionNumber: number;
  mode: 'video' | 'audio' | 'text';
  textResponse?: string;
  starRating?: number;
  mediaBlob?: Blob;
  mediaUrl?: string;
  storageUrl?: string;
  fileSize?: number;
  duration?: number;
  timestamp: Date;
}

export interface FeedbackSession {
  id: string;
  responses: FeedbackResponse[];
  consent: boolean;
  completed: boolean;
  driveFileId?: string;
  selectedMode?: 'video' | 'audio' | 'text';
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseSession {
  id: string;
  consent: boolean;
  selected_mode: 'video' | 'audio' | 'text';
  created_at: string;
  updated_at: string;
  completed: boolean;
  drive_file_id?: string;
}

export interface DatabaseTextFeedback {
  id: string;
  session_id: string;
  question_number: number;
  text_response: string;
  star_rating: number;
  created_at: string;
}

export interface DatabaseAudioFeedback {
  id: string;
  session_id: string;
  question_number: number;
  storage_url: string;
  file_size: number;
  duration?: number;
  created_at: string;
}

export interface DatabaseVideoFeedback {
  id: string;
  session_id: string;
  question_number: number;
  storage_url: string;
  file_size: number;
  duration?: number;
  created_at: string;
}

export interface AppState {
  currentStep: 'welcome' | 'mode-selection' | 'consent' | 'feedback' | 'closing' | 'ready-to-upload' | 'processing' | 'complete';
  currentQuestion: number;
  selectedMode: 'video' | 'audio' | 'text' | null;
  consent: boolean | null;
  responses: FeedbackResponse[];
  isProcessing: boolean;
  error: string | null;
  highContrast: boolean;
}

export interface VideoConfig {
  welcome: string;
  questions: string[];
  closing: string;
}