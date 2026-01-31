# Self-Hostable AI Chat Application

A modern, feature-rich AI chat application built with SvelteKit and OpenRouter, supporting multi-model conversations with intelligent auto-routing, streaming responses, and comprehensive analytics.

## ✨ Features

### 🤖 AI Capabilities
- **Auto Mode**: Intelligent model routing using gpt-oss-20b to select the best model for each query
- **Manual Multi-Model Mode**: Run multiple models simultaneously and compare responses
- **Real-time Streaming**: Token-by-token streaming with typed animation effects
- **Chat Summaries**: Automatic generation of descriptive chat titles

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

## 🖥️ Desktop App (Tauri)

Build a native desktop application using Tauri.

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install)
- Bun (for the frontend build)

### Development

```bash
# Run the desktop app in development mode
bun run desktop
# or
bun run tauri:dev
```

### Build

```bash
# Build the desktop app for production
bun run desktop:build
# or
bun run tauri:build
```

Built applications will be in `src-tauri/target/release/bundle/`.

### Platform Support

- **Windows**: `.msi` installer and `.exe`
- **macOS**: `.dmg` and `.app`
- **Linux**: `.deb`, `.rpm`, `.AppImage`

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
src-tauri/              # Tauri desktop app configuration
├── src/                # Rust source code
├── icons/              # App icons
├── Cargo.toml          # Rust dependencies
└── tauri.conf.json     # Tauri configuration
```

## 🔧 Configuration

### Supported Models

**Auto Mode** (models available for intelligent routing):
- `deepseek/deepseek-r1-distill-qwen-32b` - Deep reasoning
- `x-ai/grok-2-1212` - Fast responses
- `google/gemini-2.5-flash-lite` - Lightweight
- `google/gemini-3-flash-preview` - Latest Google model
- `anthropic/claude-sonnet-4.5` - Complex reasoning
- `openai/gpt-4.5-turbo-preview` - Advanced capabilities
- `google/gemini-2.5-flash-image` (Nano Banana) - Image analysis

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

### Database Commands

```bash
# Generate migration files
bun run db:generate

# Apply migrations
bun run db:migrate

# Push schema changes (development)
bun run db:push

# Open Drizzle Studio (database GUI)
bun run db:studio
```

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

## 📊 Database Schema

### Tables

- **users**: User accounts and OAuth data
- **api_keys**: Encrypted OpenRouter API keys
- **chats**: Chat sessions with titles and modes
- **messages**: Individual messages in conversations
- **message_stats**: Token usage, cost, and latency metrics

### Indexes

Optimized queries with indexes on:
- User lookups
- Chat retrieval by user
- Message ordering
- Stats aggregation by timestamp and model

## 🎯 Roadmap

- [x] Core chat functionality
- [x] Auto-routing with parallel execution
- [x] Multi-model streaming
- [x] Stats tracking and dashboard
- [x] Encrypted API key storage
- [x] Docker support for easy self-hosting
- [x] Tauri desktop app
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
- Database with [Drizzle ORM](https://orm.drizzle.team)
- Desktop app with [Tauri](https://tauri.app)

## 💬 Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

**Happy chatting! 🚀**
