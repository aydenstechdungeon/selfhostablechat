# Desktop App (Electron)

## Building the Desktop App

### Prerequisites
- Node.js 18+ or Bun
- Electron dependencies installed

### Build for Linux (AppImage)
```bash
bun install
bun run electron:build:linux
```

The AppImage will be in `dist-electron/` directory.

### Build for Windows
```bash
bun install
bun run electron:build:win
```

The Windows installer will be in `dist-electron/` directory.

### Development Mode
To run the app in development mode:
1. Start the SvelteKit dev server on port 3421:
   ```bash
   PORT=3421 bun run dev
   ```
2. In another terminal, start Electron:
   ```bash
   bun run electron:dev
   ```

## Architecture

The Electron app bundles the entire SvelteKit server with the desktop application. When launched:
1. Electron starts the Node.js server on port 3421
2. The server is automatically configured with `OPENROUTER_API_URL=https://openrouter.ai/api/v1`
3. Electron creates a window and loads the local server
4. All user data is stored in the browser's IndexedDB and localStorage

This approach allows the app to work completely offline (except for AI API calls) and maintains full feature parity with the web version.

## Environment Variables

The following environment variables are automatically set in production builds:
- `PORT=3421`
- `OPENROUTER_API_URL=https://openrouter.ai/api/v1`
- `ORIGIN=http://localhost:3421`
- `HOST=127.0.0.1`

## Notes

- The server runs on port 3421 (web dev uses 5173, Docker uses 3420)
- All data is stored client-side using IndexedDB and localStorage
- The app uses the same features as the web version
