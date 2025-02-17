from functools import lru_cache
import json
from pathlib import Path

from votify.spotify_api import SpotifyApi
from votify.downloader import Downloader
from votify.downloader_audio import DownloaderAudio
from votify.downloader_episode import DownloaderEpisode
from votify.downloader_episode_video import DownloaderEpisodeVideo
from votify.downloader_video import DownloaderVideo
from votify.enums import AudioQuality, DownloadMode, RemuxModeAudio, RemuxModeVideo, VideoFormat

ydl_opts = {
    'format': 'bestvideo[ext=mp3]+bestaudio[ext=m4a]/best[ext=mp4]/best',
    'paths': {
        'home': str(Path(__file__).parent.parent.parent/"extractions"),
        'mp3': 'test'
    }
#   'outtmpl': {
#       'default': str(d.parent.parent/"backend"/"extraction")
#   }
}

class YoutubeWorker:

    def __init__(self, cookies_path: Path):
        self.downloader = Downloader(
            spotify_api = SpotifyApi.from_cookies_file(cookies_path),
            output_path = Path("./Spotify"),
            temp_path = Path("./temp"),
            wvd_path = Path("./device.wvd")
        )

#       self.yt_context: Optional[yt_dlp.YoutubeDL] = None

#   def __enter__(self):
#       """Enter the context manager"""
#       print("Initializing YouTube downloader...")
#       self.yt_context = yt_dlp.YoutubeDL(ydl_opts)
#       return self

#   def __exit__(self, exc_type, exc_value, traceback):
#       """Exit the context manager and handle cleanup"""
#       if exc_type is not None:
#           print(f"An error occurred: {exc_type}, {exc_value}")
#       if self.yt_context:
#           self.yt_context.close()
#       return False

    def get_url_info(self, url: str):
        return self.downloader.get_url_info(url)

    def get_url_metadata(self, url: str):
        return self.downloader.spotify_api.get_episode(self.get_url_info(url).id)

    @lru_cache
    def get_video_downloader(self):
        """ Based on the class downloader, get the video epoisode downloader """
        download_mode = DownloadMode.YTDLP
        audio_quality = AudioQuality.AAC_MEDIUM
        remux_mode_audio = RemuxModeAudio.FFMPEG
        video_format = VideoFormat.MP4
        remux_mode_video = RemuxModeVideo.FFMPEG

        downloader_audio = DownloaderAudio(self.downloader, audio_quality, download_mode, remux_mode_audio)
        downloader_episode = DownloaderEpisode(downloader_audio)
        downloader_video = DownloaderVideo(self.downloader, video_format, remux_mode_video)
        downloader_episode_video = DownloaderEpisodeVideo(downloader_video, downloader_episode)

        return downloader_episode_video

    def download(self, url: str) -> None:

        url_info = self.get_url_info(url)
        media_metadata = self.downloader.spotify_api.get_episode(url_info.id)

        gid_metadata = self.downloader.get_gid_metadata(url_info.id, url_info.type)

        print(f"🔍 URL Info: {url_info}")
        print(f"📝 Media Metadata: {json.dumps(media_metadata, indent=2)}")
        print(f"ℹ️ GID Metadata: {json.dumps(gid_metadata, indent=2)}")

        video_downloader = self.get_video_downloader()
        video_downloader.download(
            episode_id=url_info.id,
            episode_metadata=media_metadata,
            gid_metadata=gid_metadata,
        )
        return

#   def other(self):
#       with self as _:
#           info = self.yt_context.extract_info(
#               extraction.youtube_url,
#           download=False
#           )
#           print(json.dumps(self.yt_context.sanitize_info(info)))
#       return info
