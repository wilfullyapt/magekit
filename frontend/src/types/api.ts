// types/api.ts

export type ExtractionStatus = 
  | 'pending'
  | 'downloading'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'cancelled';

export interface Video {
  id: string;
  youtube_url: string;
  video_title?: string;
  start_time: string;
  end_time: string;
  notes: string;
  status: ExtractionStatus;
  progress?: number;
  extraction_datetime: string;
  creator_name: string;
  task_id?: string;
}

export interface ExtractionCreate {
  youtubeUrl: string;
  startTime: string;
  endTime: string;
  notes: string;
  generateCaptions: boolean;
}

export interface ExtractionUpdate {
  type: 'extraction_update';
  extraction_id: string;
  status: ExtractionStatus;
  progress?: number;
  message?: string;
  error?: string;
  task_id?: string;
}

export interface ExtractionUpdate {
  type: 'extraction_update';
  extraction_id: string;
  status: ExtractionStatus;
  progress?: number;
  message?: string;
  error?: string;
  task_id?: string;
}
