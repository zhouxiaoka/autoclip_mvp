#!/usr/bin/env python3
"""
YouTube视频下载器 - 基于yt-dlp实现YouTube视频和字幕下载
集成到自动切片工具项目中，接口与BilibiliDownloader保持一致
"""

import os
import re
import asyncio
import logging
from pathlib import Path
from typing import Dict, Any, Optional, Callable
from datetime import datetime
import yt_dlp
import subprocess

try:
    from .error_handler import FileIOError, ValidationError, ProcessingError
except ImportError:
    # 独立运行时的导入
    import sys
    sys.path.append(str(Path(__file__).parent.parent))
    from utils.error_handler import FileIOError, ValidationError, ProcessingError

logger = logging.getLogger(__name__)

class YouTubeVideoInfo:
    """YouTube视频信息类"""
    def __init__(self, info_dict: Dict[str, Any]):
        self.vid = info_dict.get('id', '')
        self.title = info_dict.get('title', 'unknown_video')
        self.duration = info_dict.get('duration', 0)
        self.uploader = info_dict.get('uploader', 'unknown')
        self.description = info_dict.get('description', '')
        self.thumbnail_url = info_dict.get('thumbnail', '')
        self.view_count = info_dict.get('view_count', 0)
        self.upload_date = info_dict.get('upload_date', '')
        self.webpage_url = info_dict.get('webpage_url', '')
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            'vid': self.vid,
            'title': self.title,
            'duration': self.duration,
            'uploader': self.uploader,
            'description': self.description,
            'thumbnail_url': self.thumbnail_url,
            'view_count': self.view_count,
            'upload_date': self.upload_date,
            'webpage_url': self.webpage_url
        }

class YouTubeDownloader:
    """YouTube视频下载器"""
    
    def __init__(self, download_dir: Optional[Path] = None):
        """
        初始化下载器
        
        Args:
            download_dir: 下载目录，默认为当前目录
        """
        self.download_dir = download_dir or Path.cwd()
        self.download_dir.mkdir(parents=True, exist_ok=True)
        
    def validate_youtube_url(self, url: str) -> bool:
        """
        验证YouTube视频链接格式
        
        Args:
            url: 视频链接
            
        Returns:
            是否为有效的YouTube链接
        """
        youtube_patterns = [
            r'https?://(www\.)?youtube\.com/watch\?v=[\w\-_]{11}',
            r'https?://youtu\.be/[\w\-_]{11}',
            r'https?://(www\.)?youtube\.com/embed/[\w\-_]{11}',
            r'https?://(www\.)?youtube\.com/v/[\w\-_]{11}',
            r'https?://m\.youtube\.com/watch\?v=[\w\-_]{11}'
        ]
        
        return any(re.match(pattern, url) for pattern in youtube_patterns)
    
    async def get_video_info(self, url: str) -> YouTubeVideoInfo:
        """
        获取视频信息（不下载）
        
        Args:
            url: 视频链接
            
        Returns:
            视频信息对象
        """
        if not self.validate_youtube_url(url):
            raise ValidationError(f"无效的YouTube视频链接: {url}")
        
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
        }
        
        try:
            loop = asyncio.get_event_loop()
            info_dict = await loop.run_in_executor(
                None, 
                self._extract_info_sync, 
                url, 
                ydl_opts
            )
            return YouTubeVideoInfo(info_dict)
        except Exception as e:
            raise ProcessingError(f"获取视频信息失败: {str(e)}")
    
    def _extract_info_sync(self, url: str, ydl_opts: Dict[str, Any]) -> Dict[str, Any]:
        """同步方式提取视频信息"""
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            return ydl.extract_info(url, download=False)
    
    async def download_video_and_subtitle(
        self, 
        url: str, 
        progress_callback: Optional[Callable[[str, float], None]] = None
    ) -> Dict[str, str]:
        """
        下载视频和字幕文件
        
        Args:
            url: 视频链接
            progress_callback: 进度回调函数，参数为(状态信息, 进度百分比)
            
        Returns:
            包含video_path和subtitle_path的字典
        """
        if not self.validate_youtube_url(url):
            raise ValidationError(f"无效的YouTube视频链接: {url}")
        
        # 获取视频信息
        video_info = await self.get_video_info(url)
        
        # 清理文件名，移除特殊字符
        safe_title = self._sanitize_filename(video_info.title)
        
        # 设置下载选项 - 支持多语言字幕
        ydl_opts = {
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            'writeautomaticsub': True,  # 下载自动生成字幕
            'writesubtitles': True,     # 下载手动字幕
            'subtitleslangs': ['zh-Hans', 'zh-Hant', 'zh', 'en'],  # 中文优先，英文备用
            'subtitlesformat': 'srt',   # 强制SRT格式
            'outtmpl': str(self.download_dir / f'{safe_title}.%(ext)s'),
            'noplaylist': True,
            'quiet': True,
            'progress': True,
        }
        
        # 添加进度钩子
        if progress_callback:
            ydl_opts['progress_hooks'] = [self._create_progress_hook(progress_callback)]
        
        try:
            if progress_callback:
                progress_callback("开始下载视频和字幕...", 0)
            
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                self._download_sync,
                url,
                ydl_opts
            )
            
            # 查找下载的文件
            video_path = self._find_downloaded_video(safe_title)
            subtitle_path = self._find_downloaded_subtitle(safe_title)
            
            if progress_callback:
                progress_callback("下载完成", 100)
            
            result = {
                'video_path': str(video_path) if video_path else '',
                'subtitle_path': str(subtitle_path) if subtitle_path else '',
                'video_info': video_info.to_dict()
            }
            
            logger.info(f"下载完成: {video_info.title}")
            return result
            
        except Exception as e:
            error_msg = f"下载失败: {str(e)}"
            if progress_callback:
                progress_callback(error_msg, 0)
            raise ProcessingError(error_msg)
    
    def _download_sync(self, url: str, ydl_opts: Dict[str, Any]):
        """同步方式下载"""
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
    
    def _create_progress_hook(self, progress_callback: Callable[[str, float], None]):
        """创建进度回调钩子"""
        def progress_hook(d):
            if d['status'] == 'downloading':
                if 'total_bytes' in d and d['total_bytes']:
                    progress = (d['downloaded_bytes'] / d['total_bytes']) * 100
                elif '_percent_str' in d:
                    # 从百分比字符串中提取数字
                    percent_str = d['_percent_str'].strip().rstrip('%')
                    try:
                        progress = float(percent_str)
                    except ValueError:
                        progress = 0
                else:
                    progress = 0
                
                speed = d.get('_speed_str', '')
                eta = d.get('_eta_str', '')
                status = f"下载中... {speed} ETA: {eta}"
                progress_callback(status, progress)
            elif d['status'] == 'finished':
                progress_callback("下载完成，正在处理...", 95)
        
        return progress_hook
    
    def _sanitize_filename(self, filename: str) -> str:
        """清理文件名，移除不安全字符"""
        # 移除或替换不安全的字符
        unsafe_chars = '<>:"/\\|?*'
        for char in unsafe_chars:
            filename = filename.replace(char, '_')
        
        # 限制文件名长度
        if len(filename) > 100:
            filename = filename[:100]
        
        return filename.strip()
    
    def _find_downloaded_video(self, title: str) -> Optional[Path]:
        """查找下载的视频文件"""
        possible_extensions = ['.mp4', '.mkv', '.webm', '.flv']
        
        for ext in possible_extensions:
            video_path = self.download_dir / f"{title}{ext}"
            if video_path.exists():
                return video_path
        
        # 如果精确匹配失败，尝试模糊匹配
        for file_path in self.download_dir.glob(f"{title}*"):
            if file_path.suffix.lower() in possible_extensions:
                return file_path
        
        return None
    
    def _find_downloaded_subtitle(self, title: str) -> Optional[Path]:
        """查找下载的字幕文件"""
        logger.info(f"正在查找字幕文件，标题: {title}")
        
        # 按优先级查找字幕文件
        subtitle_priorities = [
            f"{title}.zh-Hans.srt",    # 简体中文
            f"{title}.zh-Hant.srt",   # 繁体中文
            f"{title}.zh.srt",        # 中文
            f"{title}.en.srt",        # 英文
            f"{title}.srt"            # 默认
        ]
        
        for subtitle_name in subtitle_priorities:
            subtitle_path = self.download_dir / subtitle_name
            if subtitle_path.exists():
                # 重命名为标准格式
                standard_path = self.download_dir / f"{title}.srt"
                if not standard_path.exists():
                    subtitle_path.rename(standard_path)
                    logger.info(f"重命名字幕文件: {subtitle_name} -> {title}.srt")
                    return standard_path
                return subtitle_path
        
        # 模糊匹配字幕文件
        for file_path in self.download_dir.glob(f"{title}*.srt"):
            logger.info(f"找到字幕文件: {file_path.name}")
            return file_path
        
        logger.warning(f"未找到字幕文件，标题: {title}")
        return None
    
    def cleanup_temp_files(self, title: str):
        """清理临时文件"""
        try:
            # 清理可能的临时文件
            for pattern in [f"{title}*.part", f"{title}*.tmp", f"{title}*.ytdl"]:
                for temp_file in self.download_dir.glob(pattern):
                    temp_file.unlink(missing_ok=True)
        except Exception as e:
            logger.warning(f"清理临时文件失败: {e}")

# 便捷函数
async def download_youtube_video(
    url: str, 
    download_dir: Optional[Path] = None,
    progress_callback: Optional[Callable[[str, float], None]] = None
) -> Dict[str, str]:
    """
    便捷的YouTube视频下载函数
    
    Args:
        url: YouTube视频链接
        download_dir: 下载目录
        progress_callback: 进度回调函数
        
    Returns:
        包含video_path和subtitle_path的字典
    """
    downloader = YouTubeDownloader(download_dir)
    return await downloader.download_video_and_subtitle(url, progress_callback)

async def get_youtube_video_info(url: str) -> YouTubeVideoInfo:
    """
    便捷的YouTube视频信息获取函数
    
    Args:
        url: YouTube视频链接
        
    Returns:
        视频信息对象
    """
    downloader = YouTubeDownloader()
    return await downloader.get_video_info(url)