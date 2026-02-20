# Self-Hostable AI Chat Application

A modern, feature-rich AI chat application built with Svelte 5, Bun, and OpenRouter. Performance-optimized, secure, and supports multi-model conversations with intelligent auto-routing, Ollama integration, and comprehensive analytics.

## Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Docker Deployment](#-docker-deployment)
- [Desktop App (Electron)](#️-desktop-app-electron)
- [Mobile App (Android via Capacitor)](#-mobile-app-android-via-capacitor)
- [Project Structure](#-project-structure)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Development](#️-development)
- [Security Considerations](#-security-considerations)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)
- [Acknowledgments](#-acknowledgments)
- [Support](#-support)

## ✨ Features

### 🤖 AI Capabilities
- **Auto Mode**: Intelligent model routing using `arcee-ai/trinity-mini:free` to select the best model for each query.
- **Manual Multi-Model Mode**: Run multiple models simultaneously and compare responses side-by-side.
- **Ollama Integration**: Support for local models via Ollama.
- **Zero Data Retention (ZDR)**: Toggle to use only privacy-compliant models with ZDR policies.
- **Real-time Streaming**: Token-by-token streaming with smooth animations and Svelte 5 reactivity.
- **Chat Summaries**: Automatic generation of descriptive chat titles.
- **Image Generation**: Native image generation with Gemini, Seedream, and GPT-5 models.
- **Web Search**: Integration with citations for up-to-date information.

### 📊 Analytics & Stats
- Per-message statistics (tokens, cost, latency).
- Multi-model aggregated stats.
- Dashboard with time-series charts (cost, usage, performance).
- Cost tracking and optimization insights.

### 🔐 Security & Privacy
- **AES-256-GCM** encrypted API key storage.
- Optional client-side encryption with IndexedDB.
- **Data Management**: Quickly clear local cache or database records.
- Secure, self-hosted session management.

### 🎨 User Experience
- **Performance**: Virtualized sidebar list for handling thousands of chat histories smoothly.
- **Modern UI**: Dark developer-tool aesthetic using Tailwind CSS v4.
- **Responsive**: Three-column layout with collapsible sidebars.
- **Cross-Platform**: Web, Desktop (Electron), and Mobile (Android).

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh) runtime (required)
- OpenRouter API key ([Get one here](https://openrouter.ai))
- (Optional) [Ollama](https://ollama.com) for local models

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/aydenstechdungeon/selfhostablechat
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

### Quick Deploy

1. **Build and run with Docker Compose**
```bash
docker-compose up -d
```

2. **Access the application**
```
http://localhost:3420
```

### Docker Commands

```bash
# View logs
docker-compose logs -f

# Rebuild after updates
docker-compose up -d --build

# Stop the application
docker-compose down
```

## 🖥️ Desktop App (Electron)

Build a native desktop application for Linux, Windows, and macOS.

```bash
# Development
bun run desktop

# Build (Linux AppImage)
bun run electron:build:linux

# Build (Windows EXE)
bun run electron:build:win

# Build (macOS DMG)
bun run electron:build:mac
```

Built applications will be in `dist-electron/`.

## 📱 Mobile App (Android via Capacitor)

Build a native Android application with a bundled Node.js server.

```bash
# Build SvelteKit and sync Capacitor
bun run mobile

# Open in Android Studio
bun run mobile:open
```

See [`CAPACITOR_IMPLEMENTATION.md`](./CAPACITOR_IMPLEMENTATION.md) for details.

## 📁 Project Structure

```
src/
├── lib/
│   ├── components/      # Svelte 5 components (Runes, Snippets)
│   ├── server/          # AI routing, streaming, and database
│   ├── stores/          # Reactive stores for state
│   ├── shared/          # Shared constants (Model definitions)
│   └── types.ts         # TypeScript definitions
├── routes/
│   ├── api/             # SSE streaming and analytics endpoints
│   └── (app)/           # Main UI routes (Chat, Dashboard, Settings)
static/                  # Assets (Icons, WebP images)
```

## 🔧 Configuration

### Supported Models (Auto-Routing)
- `arcee-ai/trinity-mini:free` - Primary Router/Summarizer
- `google/gemini-3-flash-preview` - Latest Gemini with vision
- `google/gemini-3.1-pro-preview` - High-quality reasoning
- `anthropic/claude-sonnet-4.6` - Advanced coding & writing
- `anthropic/claude-opus-4.6` - Complex reasoning
- `deepseek/deepseek-r1-0528:free` - Deep reasoning
- `openai/gpt-4o-mini` - Fast, efficient
- `x-ai/grok-4.1-fast` - Fast general purpose

### Local Models (Ollama)
The application can connect to a local Ollama instance (default: `http://localhost:11434`). Configure this in the Settings panel or via environment variables in future updates.

## 🔒 Security Considerations

- **API Keys**: Stored with AES-256-GCM encryption. Use server-side storage for the best security.
- **Privacy**: Zero Data Retention mode filters for providers that guarantee your data isn't used for training.
- **Self-Hosting**: You own your database (SQLite) and data.

## 🎯 Roadmap

- [x] Core chat functionality with Svelte 5 Runes
- [x] Auto-routing with Trinity Mini
- [x] Ollama local model integration
- [x] Multi-model comparison mode
- [x] Desktop & Mobile (Android) app builds
- [x] Image Generation (Gemini, Seedream)
- [x] Web search integration
- [x] Virtualized sidebar for huge chat histories
- [x] Data management features (Clear Cache)
- [ ] iOS app support (Capacitor)
- [ ] Voice input/output support
- [ ] Advanced plugin system

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

---

**Happy chatting! 🚀**
