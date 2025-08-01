# AutoClip - AI-Powered Video Clipping Tool

🎬 An intelligent video clipping and collection recommendation system based on AI, supporting automatic video download from multiple platforms (Bilibili & YouTube), subtitle extraction, intelligent slicing, and collection generation.

## ✨ Features

- 🔥 **Intelligent Video Clipping**: AI-powered video content analysis for high-quality automatic clipping
- 📺 **Multi-Platform Video Download**: Support for automatic video download and subtitle extraction from Bilibili and YouTube
- 🎯 **Smart Collection Recommendations**: AI automatically analyzes slice content and recommends related collections
- 🎨 **Manual Collection Editing**: Support drag-and-drop sorting, adding/removing slices
- 📦 **One-Click Package Download**: Support one-click package download for all slices and collections
- 🌐 **Modern Web Interface**: React + TypeScript + Ant Design
- ⚡ **Real-time Processing Status**: Real-time display of processing progress and logs
- 🌍 **YouTube Integration**: Full support for YouTube video processing with automatic subtitle download

## 🚀 Quick Start

### Requirements

- Python 3.8+
- Node.js 16+
- DashScope API Key (for AI analysis)
- yt-dlp (for YouTube video download, included in requirements.txt)

### Installation

1. **Clone the project**
```bash
git clone git@github.com:zhouxiaoka/autoclip_mvp.git
cd autoclip_mvp
```

2. **Install backend dependencies**
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# or venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt
```

3. **Install frontend dependencies**
```bash
cd frontend
npm install
cd ..
```

4. **Configure API keys**
```bash
# Copy example configuration file
cp data/settings.example.json data/settings.json

# Edit configuration file and add your API key
{
  "dashscope_api_key": "your-dashscope-api-key",
  "model_name": "qwen-plus",
  "chunk_size": 5000,
  "min_score_threshold": 0.7,
  "max_clips_per_collection": 5,
  "default_browser": "chrome"
}
```

### Start Services

#### Method 1: Using startup script (Recommended)
```bash
chmod +x start_dev.sh
./start_dev.sh
```

#### Method 2: Manual startup
```bash
# Start backend service
source venv/bin/activate
python backend_server.py

# Open new terminal, start frontend service
cd frontend
npm run dev
```

#### Method 3: Command line tool
```bash
# Process local video files
python main.py --video input.mp4 --srt input.srt --project-name "My Project"

# Process existing project
python main.py --project-id <project_id>

# List all projects
python main.py --list-projects
```

### Access URLs

- 🌐 **Frontend Interface**: http://localhost:3000
- 🔌 **Backend API**: http://localhost:8000
- 📚 **API Documentation**: http://localhost:8000/docs

## 📁 Project Structure

```
autoclip_mvp/
├── backend_server.py          # FastAPI backend service
├── main.py                   # Command line entry
├── start_dev.sh              # Development environment startup script
├── requirements.txt           # Python dependencies
├── .gitignore               # Git ignore file
├── README.md                # Project documentation
│
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── store/          # State management
│   │   └── hooks/          # Custom Hooks
│   ├── package.json        # Frontend dependencies
│   └── vite.config.ts      # Vite configuration
│
├── src/                    # Core business logic
│   ├── main.py            # Main processing logic
│   ├── config.py          # Configuration management
│   ├── api.py             # API interfaces
│   ├── pipeline/          # Processing pipeline
│   │   ├── step1_outline.py    # Outline extraction
│   │   ├── step2_timeline.py   # Timeline generation
│   │   ├── step3_scoring.py    # Score calculation
│   │   ├── step4_title.py      # Title generation
│   │   ├── step5_clustering.py # Clustering analysis
│   │   └── step6_video.py      # Video generation
│   ├── utils/             # Utility functions
│   │   ├── llm_client.py      # AI client
│   │   ├── video_processor.py # Video processing
│   │   ├── text_processor.py  # Text processing
│   │   ├── project_manager.py # Project management
│   │   ├── error_handler.py   # Error handling
│   │   ├── bilibili_downloader.py # Bilibili downloader
│   │   └── youtube_downloader.py  # YouTube downloader
│   └── upload/            # File upload
│       └── upload_manager.py
│
├── data/                  # Data files
│   ├── projects.json     # Project data
│   └── settings.json     # Configuration file
│
├── uploads/              # Upload file storage
│   ├── tmp/             # Temporary download files
│   └── {project_id}/    # Project files
│       ├── input/       # Original files
│       └── output/      # Processing results
│           ├── clips/   # Sliced videos
│           └── collections/ # Collection videos
│
├── prompt/               # AI prompt templates
│   ├── business/        # Business & Finance
│   ├── knowledge/       # Knowledge & Science
│   ├── entertainment/   # Entertainment content
│   └── ...
│
└── tests/               # Test files
    ├── test_config.py
    └── test_error_handler.py
```

## 🔧 Configuration

### API Key Configuration
Configure your DashScope API key in `data/settings.json`:
```json
{
  "dashscope_api_key": "your-dashscope-api-key",
  "model_name": "qwen-plus",
  "chunk_size": 5000,
  "min_score_threshold": 0.7,
  "max_clips_per_collection": 5,
  "default_browser": "chrome"
}
```

### Browser Configuration
Support for Chrome, Firefox, Safari and other browsers for Bilibili video download:
```json
{
  "default_browser": "chrome"
}
```

## 📖 User Guide

### 1. Upload Local Video
1. Visit http://localhost:3000
2. Click "Upload Video" button
3. Select video file and subtitle file (required)
4. Fill in project name and category
5. Click "Start Processing"

### 2. Download Video from Platforms
#### Bilibili Video Download
1. Click "Video Link Import" on homepage  
2. Enter Bilibili video link (must be a video with subtitles)
3. Select browser (for login status)
4. Click "Start Download"

#### YouTube Video Download
1. Click "Video Link Import" on homepage
2. Enter YouTube video link (supports various YouTube URL formats)
3. Select project category
4. Click "Start Download" - the system will automatically download video and subtitles

### 3. Edit Collections
1. Enter project detail page
2. Click collection card to enter edit mode
3. Drag and drop slices to adjust order
4. Add or remove slices
5. Save changes

### 4. Download Project
1. Click download button on project card
2. Automatically package all slices and collections
3. Download complete zip file

## 🛠️ Development Guide

### Backend Development
```bash
# Start development server (with hot reload)
python backend_server.py

# Run tests
pytest tests/
```

### Frontend Development
```bash
cd frontend
npm run dev    # Development mode
npm run build  # Production build
npm run lint   # Code linting
```

### Adding New Video Categories
1. Create new category folder in `prompt/` directory
2. Add corresponding prompt template files
3. Add category options in frontend `src/services/api.ts`

### Supported Video Platforms
- **Bilibili**: Supports most Bilibili video formats and automatic subtitle extraction
- **YouTube**: Supports standard YouTube video URLs and playlist links with automatic subtitle download
- **Local Upload**: Supports uploading local video files with custom subtitle files

### API Endpoints
- **YouTube**: `/api/youtube/parse`, `/api/youtube/download`, `/api/youtube/tasks`
- **Bilibili**: `/api/bilibili/parse`, `/api/bilibili/download`, `/api/bilibili/tasks`
- **Projects**: `/api/projects`, `/api/projects/{id}/process`

## 🐛 FAQ

### Q: Bilibili video download failed?
A: Make sure you're logged into your Bilibili account and select the correct browser. Chrome browser is recommended.

### Q: YouTube video download failed?
A: Ensure you have a stable internet connection and that the YouTube video is publicly accessible. Some private or region-restricted videos may not be downloadable.

### Q: No subtitles found for YouTube video?
A: The system automatically tries to download Chinese subtitles first, then English. If no subtitles are available, automatic subtitle generation will be attempted.

### Q: AI analysis is slow?
A: You can adjust the `chunk_size` parameter. Smaller values will improve speed but may affect quality.

### Q: Slice quality is not good?
A: Adjust the `min_score_threshold` parameter. Higher values will improve slice quality but reduce quantity.

### Q: Too few collections?
A: Adjust the `max_clips_per_collection` parameter to increase the maximum number of slices per collection.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Welcome to submit Issues and Pull Requests!

1. Fork this project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Contact

For questions or suggestions, please contact us through:

### 💬 QQ  
<img src="./qq_qr.jpg" alt="QQ二维码" width="150">

### 📱 Feishu  
<img src="./feishu_qr.jpg" alt="飞书二维码" width="150">

### 📧 Other Contact Methods
- Submit a [GitHub Issue](https://github.com/zhouxiaoka/autoclip_mvp/issues)
- Send email to: christine_zhouye@163.com
- Add the above QQ or Feishu contact

## 🤝 Contributing

Welcome to contribute code! Please see [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

⭐ If this project helps you, please give it a star! 
