'use client';

import { VideoGrid } from '@/components/videos/VideoGrid';

export default function VideosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Video Clips</h1>
      </div>
      <VideoGrid />
    </div>
  );
}
