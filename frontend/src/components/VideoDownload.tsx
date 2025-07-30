import React, { useState, useEffect } from 'react'
import { Input, Button, Space, Select, message, Progress, Card, Typography } from 'antd'
import { projectApi, bilibiliApi, youtubeApi, VideoCategory, BilibiliDownloadRequest, YouTubeDownloadRequest, BilibiliDownloadTask, YouTubeDownloadTask, BilibiliVideoInfo, YouTubeVideoInfo } from '../services/api'

const { Text } = Typography

interface VideoDownloadProps {
  onDownloadSuccess: (projectId: string) => void
}

type VideoInfo = BilibiliVideoInfo | YouTubeVideoInfo
type DownloadTask = BilibiliDownloadTask | YouTubeDownloadTask

const VideoDownload: React.FC<VideoDownloadProps> = ({ onDownloadSuccess }) => {
  const [url, setUrl] = useState('')
  const [projectName, setProjectName] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [categories, setCategories] = useState<VideoCategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [currentTask, setCurrentTask] = useState<DownloadTask | null>(null)
  const [pollingInterval, setPollingInterval] = useState<number | null>(null)
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState('')
  const [defaultBrowser, setDefaultBrowser] = useState<string>('')
  const [videoType, setVideoType] = useState<'bilibili' | 'youtube' | null>(null)

  // 从设置中获取默认浏览器
  const loadDefaultBrowser = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const settings = await response.json()
        setDefaultBrowser(settings.default_browser || '')
      }
    } catch (error) {
      console.error('获取默认浏览器设置失败:', error)
    }
  }

  // 加载视频分类配置和默认浏览器
  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true)
      try {
        const response = await projectApi.getVideoCategories()
        setCategories(response.categories)
        if (response.default_category) {
          setSelectedCategory(response.default_category)
        } else if (response.categories.length > 0) {
          setSelectedCategory(response.categories[0].value)
        }
      } catch (error) {
        console.error('Failed to load video categories:', error)
        message.error('加载视频分类失败')
      } finally {
        setLoadingCategories(false)
      }
    }

    loadCategories()
    loadDefaultBrowser()
  }, [])

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

  // 检测视频类型
  const detectVideoType = (url: string): 'bilibili' | 'youtube' | null => {
    const bilibiliPatterns = [
      /^https?:\/\/www\.bilibili\.com\/video\/[Bb][Vv][0-9A-Za-z]+/,
      /^https?:\/\/bilibili\.com\/video\/[Bb][Vv][0-9A-Za-z]+/,
      /^https?:\/\/b23\.tv\/[0-9A-Za-z]+/,
      /^https?:\/\/www\.bilibili\.com\/video\/av\d+/,
      /^https?:\/\/bilibili\.com\/video\/av\d+/
    ]

    const youtubePatterns = [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w\-_]{11}/,
      /^https?:\/\/youtu\.be\/[\w\-_]{11}/,
      /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w\-_]{11}/,
      /^https?:\/\/(www\.)?youtube\.com\/v\/[\w\-_]{11}/,
      /^https?:\/\/m\.youtube\.com\/watch\?v=[\w\-_]{11}/
    ]

    if (bilibiliPatterns.some(pattern => pattern.test(url))) {
      return 'bilibili'
    }
    if (youtubePatterns.some(pattern => pattern.test(url))) {
      return 'youtube'
    }
    return null
  }

  const parseVideoInfo = async () => {
    if (!url.trim()) {
      setError('请输入正确的视频链接')
      return
    }

    const detectedType = detectVideoType(url.trim())
    if (!detectedType) {
      setError('请输入正确的B站或YouTube视频链接')
      return
    }

    setVideoType(detectedType)
    setParsing(true)
    setError('')
    
    try {
      let parsedVideoInfo: VideoInfo
      
      if (detectedType === 'bilibili') {
        const response = await bilibiliApi.parseVideoInfo(url.trim(), defaultBrowser)
        parsedVideoInfo = response.video_info
      } else {
        const response = await youtubeApi.parseVideoInfo(url.trim())
        parsedVideoInfo = response.video_info
      }
      
      setVideoInfo(parsedVideoInfo)
      setError('')
      
      // 自动填充项目名称
      if (!projectName && parsedVideoInfo.title) {
        setProjectName(parsedVideoInfo.title)
      }
      
      return parsedVideoInfo
    } catch (error: unknown) {
      setError('请输入正确的视频链接')
      setVideoInfo(null)
      setVideoType(null)
    } finally {
      setParsing(false)
    }
  }

  const startPolling = (taskId: string, type: 'bilibili' | 'youtube') => {
    const interval = setInterval(async () => {
      try {
        let task: DownloadTask
        if (type === 'bilibili') {
          task = await bilibiliApi.getTaskStatus(taskId)
        } else {
          task = await youtubeApi.getTaskStatus(taskId)
        }
        
        setCurrentTask(task)
        
        if (task.status === 'completed') {
          clearInterval(interval)
          setPollingInterval(null)
          setDownloading(false)
          message.success('视频下载完成！')
          
          if (task.project_id) {
            onDownloadSuccess(task.project_id)
          }
          
          resetForm()
        } else if (task.status === 'error') {
          clearInterval(interval)
          setPollingInterval(null)
          setDownloading(false)
          message.error(task.error || '下载失败')
        }
      } catch (error) {
        console.error('轮询任务状态失败:', error)
      }
    }, 2000)
    
    setPollingInterval(interval)
  }

  const handleDownload = async () => {
    if (!url.trim()) {
      message.error('请输入视频链接')
      return
    }

    if (!videoType) {
      message.error('请输入有效的B站或YouTube视频链接')
      return
    }

    setDownloading(true)
    
    try {
      let response: { task_id: string }
      
      if (videoType === 'bilibili') {
        const requestBody: BilibiliDownloadRequest = {
          url: url.trim(),
          project_name: projectName.trim() || '未命名项目',
          video_category: selectedCategory
        }
        
        if (defaultBrowser) {
          requestBody.browser = defaultBrowser
        }

        response = await bilibiliApi.createDownloadTask(requestBody)
      } else {
        const requestBody: YouTubeDownloadRequest = {
          url: url.trim(),
          project_name: projectName.trim() || '未命名项目',
          video_category: selectedCategory
        }

        response = await youtubeApi.createDownloadTask(requestBody)
      }
      
      message.success('下载任务创建成功，正在处理...')
      
      const taskBase = {
        task_id: response.task_id,
        url: url.trim(),
        status: 'pending' as const,
        progress: 0,
        status_message: '等待开始下载',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      if (videoType === 'bilibili') {
        setCurrentTask({
          ...taskBase,
          project_name: projectName.trim() || '',
          video_category: selectedCategory,
          browser: defaultBrowser,
        } as BilibiliDownloadTask)
      } else {
        setCurrentTask({
          ...taskBase,
          project_name: projectName.trim() || '',
          video_category: selectedCategory,
        } as YouTubeDownloadTask)
      }
      
      // 开始轮询任务状态
      startPolling(response.task_id, videoType)
      
    } catch (error: unknown) {
      setDownloading(false)
      const errorMessage = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || (error as Error)?.message || '创建下载任务失败'
      message.error(errorMessage)
    }
  }

  const resetForm = () => {
    setUrl('')
    setProjectName('')
    setCurrentTask(null)
    setVideoInfo(null)
    setVideoType(null)
    if (categories.length > 0) {
      setSelectedCategory(categories[0].value)
    }
  }

  const stopDownload = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }

    setCurrentTask(null)
    setDownloading(false)
    message.info('已停止监控下载任务')
  }

  const getPlatformName = () => {
    if (videoType === 'bilibili') return 'B站'
    if (videoType === 'youtube') return 'YouTube'
    return '视频'
  }

  return (
    <div style={{
      width: '100%',
      margin: '0 auto'
    }}>
      {/* 输入表单 */}
      <div style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <div>
            <Input.TextArea
              placeholder="请粘贴视频链接，支持：&#10;• B站：https://www.bilibili.com/video/BV1xx411c7mu&#10;• YouTube：https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                // 清除之前的解析结果和错误信息
                if (videoInfo) {
                  setVideoInfo(null)
                  setProjectName('')
                  setVideoType(null)
                }
                if (error) {
                  setError('')
                }
              }}
              onBlur={() => {
                // 失去焦点时自动解析
                if (url.trim() && !videoInfo && detectVideoType(url.trim())) {
                  parseVideoInfo();
                }
              }}
              style={{
                background: 'rgba(38, 38, 38, 0.8)',
                border: '1px solid rgba(79, 172, 254, 0.3)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '14px',
                resize: 'none'
              }}
              rows={3}
              disabled={downloading || parsing}
            />
            {parsing && (
              <div style={{
                marginTop: '8px',
                color: '#4facfe',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>正在解析视频信息...</span>
              </div>
            )}
            {error && !parsing && (
              <div style={{
                marginTop: '8px',
                color: '#ff4d4f',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}
          </div>

          {/* 视频信息展示 */}
          {videoInfo && !error && (
            <Card
              size="small"
              style={{
                background: 'rgba(79, 172, 254, 0.1)',
                border: '1px solid rgba(79, 172, 254, 0.3)',
                borderRadius: '8px'
              }}
              bodyStyle={{ padding: '12px' }}
            >
              <div style={{ color: '#4facfe', marginBottom: '4px', fontWeight: 600 }}>
                {getPlatformName()}视频信息
              </div>
              <div style={{ color: '#ffffff', marginBottom: '4px', fontWeight: 600 }}>
                {videoInfo.title}
              </div>
              <div style={{ color: '#cccccc', fontSize: '12px' }}>
                UP主：{videoInfo.uploader} | 
                时长：{Math.floor(videoInfo.duration / 60)}分{videoInfo.duration % 60}秒 | 
                播放量：{videoInfo.view_count?.toLocaleString() || 'N/A'}
              </div>
            </Card>
          )}

          {/* 项目配置 */}
          <div>
            <Input
              placeholder="项目名称（可选，留空将使用视频标题）"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              style={{
                background: 'rgba(38, 38, 38, 0.8)',
                border: '1px solid rgba(79, 172, 254, 0.3)',
                borderRadius: '8px',
                color: '#ffffff'
              }}
              disabled={downloading}
            />
          </div>

          <div>
            <Select
              placeholder="选择视频分类"
              value={selectedCategory}
              onChange={setSelectedCategory}
              style={{ 
                width: '100%',
                background: 'rgba(38, 38, 38, 0.8)',
                border: '1px solid rgba(79, 172, 254, 0.3)',
                borderRadius: '8px'
              }}
              loading={loadingCategories}
              disabled={downloading}
            >
              {categories.map(category => (
                <Select.Option key={category.value} value={category.value}>
                  <span style={{ marginRight: '8px' }}>{category.icon}</span>
                  {category.name}
                </Select.Option>
              ))}
            </Select>
          </div>

          {/* 操作按钮 */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button
              type="primary"
              onClick={handleDownload}
              loading={downloading}
              disabled={!url.trim() || !videoType || parsing}
              style={{
                flex: 1,
                height: '40px',
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600
              }}
            >
              {downloading ? '下载中...' : `开始下载${getPlatformName()}视频`}
            </Button>
            
            {downloading && (
              <Button
                onClick={stopDownload}
                style={{
                  height: '40px',
                  borderRadius: '8px',
                  background: 'rgba(255, 77, 79, 0.1)',
                  border: '1px solid rgba(255, 77, 79, 0.3)',
                  color: '#ff4d4f'
                }}
              >
                停止监控
              </Button>
            )}
          </div>
        </Space>
      </div>

      {/* 下载进度 */}
      {currentTask && (
        <Card
          style={{
            background: 'rgba(26, 26, 46, 0.8)',
            border: '1px solid rgba(79, 172, 254, 0.3)',
            borderRadius: '12px',
            marginTop: '16px'
          }}
          bodyStyle={{ padding: '16px' }}
        >
          <div style={{ marginBottom: '12px' }}>
            <Text style={{ color: '#4facfe', fontWeight: 600 }}>
              下载进度
            </Text>
          </div>
          
          <Progress
            percent={currentTask.progress}
            status={currentTask.status === 'error' ? 'exception' : 'active'}
            strokeColor={{
              '0%': '#4facfe',
              '100%': '#00f2fe',
            }}
            style={{ marginBottom: '8px' }}
          />
          
          <div style={{ color: '#cccccc', fontSize: '14px' }}>
            状态：{currentTask.status_message}
          </div>
          
          {currentTask.status === 'error' && currentTask.error && (
            <div style={{ color: '#ff4d4f', fontSize: '14px', marginTop: '4px' }}>
              错误：{currentTask.error}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

export default VideoDownload