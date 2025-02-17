// frontend/src/components/videos/VideoGrid.tsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { VideoCard } from './VideoCard';
import { EmptyState } from './EmptyState';
import { LoadingState } from './LoadingState';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Video, ExtractionUpdate } from '@/types/api';
import api from '@/lib/axios';

export function VideoGrid() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operations, setOperations] = useState<Record<string, boolean>>({});

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<Video[]>('/api/videos');
      setVideos(response.data);
    } catch (err: any) {
      console.error('Error fetching videos:', err);
      const errorMessage = err.response?.status === 404 
        ? 'Unable to load videos. Please try again later.'
        : err.response?.data?.detail || 'Failed to load videos. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setOperations(prev => ({ ...prev, [id]: true }));
      await api.delete(`/api/videos/${id}`);
      setVideos(prevVideos => prevVideos.filter(video => video.id !== id));
    } catch (err: any) {
      console.error('Delete error:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to delete video. Please try again.';
      setError(errorMessage);
    } finally {
      setOperations(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleRedownload = async (id: string) => {
    try {
      setOperations(prev => ({ ...prev, [id]: true }));
      const response = await api.post(`/api/videos/${id}/redownload`);

      if (response.data.new_id) {
        setVideos(prevVideos => 
          prevVideos.map(video =>
            video.id === id
              ? { ...video, id: response.data.new_id, status: 'processing' }
              : video
          )
        );
      }
    } catch (err: any) {
      console.error('Redownload error:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to redownload video. Please try again.';
      setError(errorMessage);
    } finally {
      setOperations(prev => ({ ...prev, [id]: false }));
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!videos.length) {
    return <EmptyState onCreateNew={() => router.push('/protected/extract')} />;
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            onDelete={() => handleDelete(video.id)}
            onRedownload={
              video.status === 'expired'
                ? () => handleRedownload(video.id)
                : undefined
            }
            isOperationInProgress={!!operations[video.id]}
          />
        ))}
      </div>
    </div>
  );
}

export default VideoGrid;
