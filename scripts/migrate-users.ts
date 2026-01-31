import Database from 'better-sqlite3';

const DATABASE_PATH = process.env.DATABASE_PATH || './data/chat.db';
const sqlite = new Database(DATABASE_PATH);

console.log('Starting database migration for authentication...');

try {
  // SQLite doesn't support dropping constraints easily, so we need to recreate the table
  console.log('Creating backup of users table...');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users;
  `);
  
  console.log('Dropping old users table...');
  sqlite.exec(`DROP TABLE IF EXISTS users;`);
  
  console.log('Creating new users table with updated schema...');
  sqlite.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_id TEXT,
      email TEXT NOT NULL UNIQUE,
      username TEXT,
      name TEXT,
      password_hash TEXT,
      avatar_url TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);
  
  console.log('Migrating existing users (if any)...');
  const oldUsers = sqlite.prepare('SELECT * FROM users_backup').all();
  
  if (oldUsers.length > 0) {
    const insert = sqlite.prepare(`
      INSERT INTO users (id, google_id, email, name, avatar_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const user of oldUsers) {
      insert.run(
        user.id,
        user.google_id,
        user.email,
        user.name,
        user.avatar_url,
        user.created_at,
        user.updated_at
      );
    }
    console.log(`Migrated ${oldUsers.length} users`);
  }
  
  console.log('Dropping backup table...');
  sqlite.exec(`DROP TABLE users_backup;`);
  
  console.log('Migration completed successfully!');
} catch (error) {
  console.error('Migration failed:', error);
  
  // Attempt to restore from backup if it exists
  try {
    const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users_backup'").all();
    if (tables.length > 0) {
      console.log('Restoring from backup...');
      sqlite.exec(`DROP TABLE IF EXISTS users;`);
      sqlite.exec(`ALTER TABLE users_backup RENAME TO users;`);
      console.log('Restored from backup');
    }
  } catch (restoreError) {
    console.error('Failed to restore from backup:', restoreError);
  }
  
  process.exit(1);
}

sqlite.close();
