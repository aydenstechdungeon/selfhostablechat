# Self-Hostable AI Chat Application

A modern, feature-rich AI chat application built with SvelteKit and OpenRouter, supporting multi-model conversations with intelligent auto-routing, streaming responses, and comprehensive analytics.

## ✨ Features

### 🤖 AI Capabilities
- **Auto Mode**: Intelligent model routing using `openai/gpt-oss-20b` to select the best model for each query
- **Manual Multi-Model Mode**: Run multiple models simultaneously and compare responses
- **Real-time Streaming**: Token-by-token streaming with typed animation effects
- **Chat Summaries**: Automatic generation of descriptive chat titles
- **Image Generation**: Native image generation with Gemini models
- **Web Search**: Optional web search integration with citations

### 📊 Analytics & Stats
- Per-message statistics (tokens, cost, latency)
- Multi-model aggregated stats
- Dashboard with time-series charts
- Cost tracking and optimization insights
- Model performance comparison

### 🔐 Security
- AES-256-GCM encrypted API key storage
- Optional client-side encryption with IndexedDB
- Server-side session management
- Secure credential handling

### 🎨 User Experience
- Modern, dark developer-tool aesthetic
- Responsive three-column layout
- Collapsible sidebars
- Chat history with search and filters
- Image/video upload support
- Model suggestion system

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh) runtime
- OpenRouter API key ([Get one here](https://openrouter.ai))

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd selfhostablechat
```

2. **Install dependencies**
```bash
bun install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

4. **Start the development server**
```bash
bun run dev
```

Visit [http://localhost:5173](http://localhost:5173)

## 🐳 Docker Deployment

The easiest way to self-host this application is using Docker.

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Quick Deploy

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd selfhostablechat
```

2. **Build and run with Docker Compose**
```bash
docker-compose up -d
```

3. **Access the application**
```
http://localhost:3420
```

### Docker Commands

```bash
# Start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down

# Rebuild after updates
docker-compose up -d --build

# Check health status
docker-compose ps
```

### Configuration

Create a `.env` file to customize the OpenRouter API URL:

```bash
OPENROUTER_API_URL=https://openrouter.ai/api/v1
```

### Port Configuration

By default, the application runs on port 3420. To use a different port, modify the `docker-compose.yml`:

```yaml
ports:
  - "8080:3420"
```

## 🖥️ Desktop App (Electron)

Build a native desktop application for Linux, Windows, and macOS using Electron.

### Prerequisites

- [Bun](https://bun.sh) runtime
- For Linux AppImage: FUSE2 (optional, see below)

### Development

```bash
# Run two terminals:

# Terminal 1: Start the dev server
PORT=3421 bun run dev

# Terminal 2: Launch Electron
bun run desktop
# or
bun run electron:dev
```

### Build

```bash
# Build for Linux (AppImage)
bun run electron:build:linux

# Build for Windows (NSIS installer)
bun run electron:build:win

# Build for all platforms
bun run electron:build
```

Built applications will be in `dist-electron/`.

### Running the Linux AppImage

**Option 1: Without FUSE (easiest)**
```bash
./dist-electron/SelfHostableChat-*.AppImage --appimage-extract-and-run
```

**Option 2: With FUSE2** (install once)
```bash
# Arch/CachyOS
sudo pacman -S fuse2

# Ubuntu/Debian
sudo apt install libfuse2

# Fedora
dnf install fuse fuse-libs

# Then run normally
./dist-electron/SelfHostableChat-*.AppImage
```

### Platform Support

- **Linux**: `.AppImage` (portable, self-contained)
- **Windows**: `.exe` with NSIS installer
- **macOS**: `.dmg` image

### Desktop App Features

- **No menu bar**: Clean, distraction-free interface
- **Bundled server**: Offline-capable (except AI API calls)
- **WebAI Cat icon**: Using `webaicat512.webp` from static assets
- **Port 3421**: Default server port for desktop app
- **Client-side storage**: All data stored locally (IndexedDB/localStorage)

## 📱 Mobile App (Android via Capacitor)

Build a native Android application with bundled Node.js server using Capacitor.

### Prerequisites

- [Bun](https://bun.sh) runtime
- [Android Studio](https://developer.android.com/studio)
- Java JDK 17 or higher

### Quick Build

```bash
# Build the Android app
bun run mobile

# Open in Android Studio
bun run mobile:open
```

Then build the APK in Android Studio:
- Build → Build Bundle(s) / APK(s) → Build APK(s)

### Development

For development with live reload:

1. **Start dev server**
   ```bash
   bun run dev
   ```

2. **Update capacitor.config.ts** to point to your local IP:
   ```ts
   server: {
     url: 'http://YOUR_LOCAL_IP:5173',
     cleartext: true
   }
   ```

3. **Sync and open**
   ```bash
   bun run capacitor:sync
   bun run mobile:open
   ```

### Mobile App Features

- **Bundled Server**: Self-contained with embedded Node.js runtime (nodejs-mobile)
- **Port 3422**: Default server port for Android app
- **Offline Capable**: All data stored locally on device
- **Auto-start Server**: Server automatically starts when app launches
- **Native Performance**: Uses native Android WebView

### Build Process

The `bun run mobile` command:
1. Builds SvelteKit app (client + server)
2. Copies server to `android/app/src/main/nodejs-assets/nodejs-project/`
3. Bundles production dependencies
4. Creates `main.js` entry point for nodejs-mobile
5. Syncs with Capacitor

### Platform Support

- **Android**: APK (portable) and AAB (Play Store)
- Architecture: ARM64, ARMv7 (via nodejs-mobile)
- Minimum SDK: 24 (Android 7.0)

### Troubleshooting

**Check Android logs:**
```bash
adb logcat | grep SelfHostableChat
adb logcat | grep nodejs-mobile
```

**Rebuild from scratch:**
```bash
rm -rf android/app/src/main/nodejs-assets/nodejs-project
bun run mobile
```

For detailed information, see [`CAPACITOR_IMPLEMENTATION.md`](./CAPACITOR_IMPLEMENTATION.md).


## 📁 Project Structure

```
src/
├── lib/
│   ├── components/          # Svelte components
│   │   ├── chat/           # Chat interface components
│   │   ├── dashboard/      # Analytics dashboard
│   │   ├── sidebar/        # Chat list and filters
│   │   ├── model-selector/ # Model selection UI
│   │   └── ui/            # Reusable UI components
│   ├── server/            # Server-side code
│   │   ├── ai/           # OpenRouter client, routing, streaming
│   │   ├── crypto/       # Encryption utilities
│   │   └── db/           # Database schema and client
│   ├── stores/           # Svelte stores for state management
│   ├── utils/            # Helper functions
│   └── types.ts          # TypeScript type definitions
├── routes/
│   ├── api/             # API endpoints
│   │   ├── chat/       # Chat streaming endpoint
│   │   ├── health/     # Health check endpoint (for Docker)
│   │   ├── stats/      # Analytics queries
│   │   └── keys/       # API key management
│   ├── (app)/          # Main application routes
│   │   ├── chat/[id]/  # Individual chat page
│   │   ├── dashboard/  # Analytics dashboard
│   │   └── settings/   # User settings
│   └── +page.svelte    # Landing page
electron/               # Electron desktop app
├── main.js             # Main process (server + window)
├── preload.js          # Preload script for security
└── README.md           # Build instructions
capacitor/              # Capacitor mobile app
├── MainActivity.java   # Android activity (template)
├── README.md           # Build instructions
├── server.ts           # Server startup utilities
└── plugin/             # Capacitor plugin for server control
    ├── index.ts        # Plugin interface
    └── web.ts          # Web implementation
android/                # Android project (generated)
├── app/
│   └── src/main/
│       ├── java/com/selfhostablechat/app/
│       │   └── MainActivity.java  # App entry point
│       └── nodejs-assets/         # Bundled server (created during build)
│           └── nodejs-project/    # Node.js server files
└── build.gradle        # Android build config
scripts/                # Build scripts
└── build-capacitor.js  # Capacitor/Android build script
static/                 # Static assets
├── webaicat512.webp    # Desktop app icon (512x512)
├── webaicat256.webp    # Desktop app icon (256x256)
└── webaicat128.webp    # Desktop app icon (128x128)
```

## 🔧 Configuration

### Supported Models

**Auto Mode** (models available for intelligent routing):
- `openai/gpt-oss-20b` - Router/summarizer model
- `openai/gpt-4o-mini` - Fast, efficient
- `openai/gpt-5.1`, `openai/gpt-5.2`, `openai/gpt-5.2-pro` - Advanced OpenAI models
- `x-ai/grok-4.1-fast` - Fast general purpose
- `google/gemini-2.5-flash-lite` - Lightweight, efficient
- `google/gemini-3-flash-preview` - Latest Gemini with vision
- `google/gemini-3-pro-image-preview` - High-quality image generation (Nano Banana Pro)
- `google/gemini-2.5-flash-image` - Image analysis/vision (Nano Banana)
- `anthropic/claude-sonnet-4.5`, `anthropic/claude-opus-4.5` - Coding, writing, complex reasoning
- `deepseek/deepseek-v3.2` - Deep reasoning
- `meta-llama/llama-4-scout`, `meta-llama/llama-4-maverick` - Meta Llama 4 models
- `moonshotai/kimi-k2.5` - General purpose
- `minimax/minimax-m2.1` - General purpose

**Manual Mode**: Any OpenRouter model can be selected

### Environment Variables

```bash
# OpenRouter API URL (default: https://openrouter.ai/api/v1)
OPENROUTER_API_URL=https://openrouter.ai/api/v1
```

## 📖 Usage

### Setting Up Your API Key

1. Navigate to Settings
2. Enter your OpenRouter API key
3. Choose storage location:
   - **Server**: Encrypted and stored in database (recommended)
   - **Local**: Encrypted in browser's IndexedDB

### Starting a Chat

1. Click "New Chat" in the sidebar
2. Select your mode:
   - **Auto**: Let AI choose the best model
   - **Manual**: Select specific model(s)
3. Type your message and send

### Auto Mode
- System automatically analyzes your query
- Selects the most appropriate model
- Generates a descriptive chat title
- Displays routing reasoning

### Manual Multi-Model Mode
- Select multiple models from the dropdown
- All models respond simultaneously
- View individual and aggregated stats
- Compare responses side-by-side

### Image/Video Support
- Upload images directly in chat
- Auto mode automatically routes to image-capable models
- Manual mode shows suggestions if incompatible model selected

## 🛠️ Development

### Type Checking

```bash
# Run type checks
bun run check

# Watch mode
bun run check:watch
```

### Building for Production

```bash
# Build the web application
bun run build

# Preview production build
bun run preview

# Build the desktop application
bun run desktop:build
```

## 🔒 Security Considerations

- **API Keys**: Always use server-side storage for production
- **HTTPS**: Use HTTPS in production for secure data transmission
- **Rate Limiting**: Built-in rate limiting (60 req/min per user, 100 global)
- **Input Validation**: All inputs validated with Zod schemas

## 🎯 Roadmap

- [x] Core chat functionality
- [x] Auto-routing with intelligent model selection
- [x] Multi-model streaming
- [x] Stats tracking and dashboard
- [x] Encrypted API key storage
- [x] Docker support for easy self-hosting
- [x] Electron desktop app (Linux, Windows, macOS)
- [x] Capacitor Android app with bundled server
- [x] Image generation support (Gemini models)
- [x] Web search integration with citations
- [x] Message branching/edit history
- [ ] iOS app support (Capacitor)
- [ ] Advanced analytics charts
- [ ] Export/import conversations
- [ ] Custom model configurations
- [ ] Voice input support
- [ ] Plugin system

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

- Built with [SvelteKit](https://kit.svelte.dev)
- Powered by [OpenRouter](https://openrouter.ai)
- UI components from [Bits UI](https://bits-ui.com)
- Desktop app with [Electron](https://www.electronjs.org)

## 💬 Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

**Happy chatting! 🚀**
