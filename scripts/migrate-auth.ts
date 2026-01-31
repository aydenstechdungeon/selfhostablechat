import { db } from '../src/lib/server/db/client';
import { sql } from 'drizzle-orm';

async function migrateDatabase() {
  console.log('Starting database migration...');

  try {
    await db.run(sql`
      ALTER TABLE users ADD COLUMN username TEXT;
    `);
    console.log('Added username column');
  } catch (e) {
    console.log('username column might already exist');
  }

  try {
    await db.run(sql`
      ALTER TABLE users ADD COLUMN password_hash TEXT;
    `);
    console.log('Added password_hash column');
  } catch (e) {
    console.log('password_hash column might already exist');
  }

  try {
    await db.run(sql`
      ALTER TABLE users DROP CONSTRAINT users_google_id_unique;
    `);
    console.log('Dropped google_id unique constraint');
  } catch (e) {
    console.log('google_id constraint might not exist or SQLite does not support DROP CONSTRAINT');
  }

  console.log('Migration completed!');
}

migrateDatabase().catch(console.error);
