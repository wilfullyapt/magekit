// src/components/videos/VideoCard.tsx
import { Calendar, Clock, DownloadCloud, RefreshCw, Trash2 } from 'lucide-react';

interface Video {
  id: string;
  youtube_url: string;
  video_title?: string;
  start_time: string;
  end_time: string;
  notes: string;
  status: 'pending' | 'downloading' | 'processing' | 'completed' | 'failed' | 'expired' | 'cancelled';
  progress?: number;
  extraction_datetime: string;
  creator_name: string;
}

const getStatusColor = (status: Video['status']): string => {
  switch (status) {
    case 'completed':
      return 'bg-green-500';
    case 'processing':
    case 'downloading':
    case 'pending':
      return 'bg-blue-500';
    case 'failed':
      return 'bg-red-500';
    case 'expired':
      return 'bg-yellow-500';
    case 'cancelled':
      return 'bg-gray-500';
    default:
      return 'bg-gray-500';
  }
};

export function VideoCard({ video, onDelete, onRedownload }: VideoCardProps) {
  const videoTitle = video.video_title || new URL(video.youtube_url).pathname.split('/').pop() || 'Untitled';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold truncate">
              {videoTitle}
            </h3>
            <div className="flex items-center space-x-2 text-sm">
              <Clock className="h-4 w-4" />
              <span>{video.start_time} - {video.end_time}</span>
              <span className="text-pink-400 dark:text-pink-300">• {video.creator_name}</span>
            </div>
          </div>
            <div className={`px-2 py-1 rounded-full text-xs text-white ${getStatusColor(video.status)}`}>
            {video.status}
          </div>
        </div>

        {/* Notes */}
        {video.notes && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
            {video.notes}
          </p>
        )}

        {/* Progress bar */}
        {video.status === 'processing' && typeof video.progress === 'number' && (
          <div className="mt-4 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, video.progress))}%` }}
            />
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(video.extraction_datetime).toLocaleDateString()}
            </span>
          </div>

          <div className="flex space-x-2">
            {/* Download button */}
            {video.status === 'completed' && (
              <button
                className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                onClick={() => window.open(`/api/videos/${video.id}/download`, '_blank')}
                title="Download video"
              >
                <DownloadCloud className="h-4 w-4" />
              </button>
            )}

            {/* Redownload button */}
            {onRedownload && (
              <button 
                className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                onClick={onRedownload}
                title="Redownload video"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}

            {/* Delete button */}
            <button
              className="p-2 text-red-600 hover:text-red-900"
              onClick={onDelete}
              title="Delete video"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
