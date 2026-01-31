#!/usr/bin/env bun

import { randomBytes } from 'crypto';
import { writeFileSync, existsSync } from 'fs';

console.log('🔧 Self-Hostable Chat - Environment Setup\n');

if (existsSync('.env')) {
  console.log('⚠️  .env file already exists!');
  console.log('   To avoid overwriting, this script will exit.');
  console.log('   If you want to regenerate, delete .env first.\n');
  process.exit(0);
}

const encryptionKey = randomBytes(32).toString('hex');
const sessionSecret = randomBytes(32).toString('hex');

const envContent = `# Database
DATABASE_PATH=./data/chat.db

# Encryption Key (AES-256-GCM)
ENCRYPTION_KEY=${encryptionKey}

# Session Secret
SESSION_SECRET=${sessionSecret}

# Google OAuth (Optional - for multi-user support)
# Get credentials from: https://console.cloud.google.com
# GOOGLE_CLIENT_ID=your_client_id_here
# GOOGLE_CLIENT_SECRET=your_client_secret_here
# OAUTH_CALLBACK_URL=http://localhost:5173/api/auth/callback

# OpenRouter API
OPENROUTER_API_URL=https://openrouter.ai/api/v1
`;

try {
  writeFileSync('.env', envContent);
  console.log('✅ Created .env file with secure random keys\n');
  console.log('📋 Next steps:');
  console.log('   1. Review and edit .env if needed');
  console.log('   2. Run: bun run db:push');
  console.log('   3. Run: bun run dev');
  console.log('   4. Open: http://localhost:5173\n');
  console.log('🔐 Add your OpenRouter API key in Settings after starting the app\n');
} catch (error) {
  console.error('❌ Failed to create .env file:', error);
  process.exit(1);
}
