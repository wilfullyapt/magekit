# backend/app/video/spotify.py

from pathlib import Path
import shutil
import asyncio
from typing import Optional

from votify.spotify_api import SpotifyApi
from votify.downloader import Downloader
from votify.downloader_audio import DownloaderAudio
from votify.downloader_episode import DownloaderEpisode
from votify.downloader_episode_video import DownloaderEpisodeVideo
from votify.downloader_video import DownloaderVideo
from votify.enums import AudioQuality, DownloadMode, RemuxModeVideo, VideoFormat

from .base import BaseWorker

class SpotifyWorker(BaseWorker):
    """Handles Spotify-specific content download and processing"""

    def __init__(self, cookies_path: Path, dest_dir: Optional[Path] = None):
        super().__init__(dest_dir)
        self._ensure_directories()

        self.spotify_api = SpotifyApi.from_cookies_file(cookies_path)
        self.downloader = Downloader(
            spotify_api=self.spotify_api,
            output_path=self.dest_dir,
            temp_path=self.temp_dir,
            wvd_path=self.dest_dir/"device.wvd",
            save_cover=True
        )

        self._audio_downloader = None
        self._episode_downloader = None
        self._video_downloader = None
        self._episode_video_downloader = None

    def _cleanup_temp_old(self, temp_dir):
        temp_dir.parent.mkdir(parents=True, exist_ok=True)
        temp_dir.mkdir(parents=True, exist_ok=True)

        try:
            shutil.rmtree(temp_dir)
            temp_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            print(f"Failed to clean temp directory: {e}")

    def __del__(self):
        """Cleanup temp directory on worker destruction"""
        try:
            temp_dir = self.dest_dir / "temp"
            if temp_dir.exists():
                shutil.rmtree(temp_dir)
                temp_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            print(f"Failed to cleanup temp directory: {e}")

    @property
    def audio_downloader(self):
        if self._audio_downloader is None:
            self._audio_downloader = DownloaderAudio(
                self.downloader,
                audio_quality=AudioQuality.AAC_HIGH,
                download_mode=DownloadMode.YTDLP
            )
        return self._audio_downloader

    @property 
    def episode_downloader(self):
        if self._episode_downloader is None:
            self._episode_downloader = DownloaderEpisode(self.audio_downloader)
        return self._episode_downloader

    @property
    def video_downloader(self):
        if self._video_downloader is None:
            self._video_downloader = DownloaderVideo(
                self.downloader,
                video_format=VideoFormat.MP4,
                remux_mode=RemuxModeVideo.FFMPEG
            )
        return self._video_downloader

    @property
    def episode_video_downloader(self):
        if self._episode_video_downloader is None:
            self._episode_video_downloader = DownloaderEpisodeVideo(
                self.video_downloader,
                self.episode_downloader
            )
        return self._episode_video_downloader

    def _download_spotify_content(self, url: str) -> Path:
        """Internal synchronous download method"""
        url_info = self.downloader.get_url_info(url)

        media_metadata = self.downloader.spotify_api.get_episode(url_info.id)
        gid_metadata = self.downloader.get_gid_metadata(url_info.id, "episode")

        tags = self.episode_downloader.get_tags(
            episode_metadata=media_metadata,
            show_metadata=self.downloader.spotify_api.get_show(media_metadata["show"]["id"])
        )

        if gid_metadata.get("video"):
            file_extension = ".mp4"
            downloader = self.episode_video_downloader
        else:
            file_extension = self.episode_downloader.get_file_extension()
            downloader = self.episode_downloader

        final_path = self.downloader.get_final_path("episode", tags, file_extension)
        downloader.download(
            episode_id=url_info.id,
            episode_metadata=media_metadata,
            gid_metadata=gid_metadata
        )

#       self.temp_files.append(str(final_path))
        return final_path

    async def download_content(self, url: str) -> Path:
        """Download content from Spotify"""
        try:
            return await asyncio.to_thread(self._download_spotify_content, url)
        except Exception as e:
            raise Exception(f"Spotify download failed: {str(e)}")

    async def process_content(self, input_path: Path, output_path: Path, start_time: str, end_time: str) -> Path:
        """Process Spotify content with ffmpeg"""
        try:
            # Convert time format and calculate duration
            start_seconds = self._time_to_seconds(start_time)
            end_seconds = self._time_to_seconds(end_time)
            duration = end_seconds - start_seconds

            # Process video using ffmpeg
            import ffmpeg
            stream = ffmpeg.input(str(input_path))
            stream = ffmpeg.output(
                stream,
                str(output_path),
                ss=start_seconds,
                t=duration,
                acodec='copy',
                vcodec='copy'
            )
            await asyncio.to_thread(ffmpeg.run, stream, overwrite_output=True, capture_stderr=True)

            return output_path

        except Exception as e:
            raise Exception(f"Content processing failed: {str(e)}")

    @staticmethod
    def _time_to_seconds(time_str: str) -> int:
        """Convert time string to seconds"""
        parts = time_str.split(':')
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
