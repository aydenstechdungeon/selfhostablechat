import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { env } from '$env/dynamic/private';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const DEFAULT_DB_PATH = './data/chat.db';
const DATABASE_PATH = env.DATABASE_PATH || DEFAULT_DB_PATH;

// Ensure database directory exists
function ensureDatabaseDirectory(dbPath: string): void {
	try {
		const directory = dirname(dbPath);
		// Create directory recursively if it doesn't exist
		mkdirSync(directory, { recursive: true });
	} catch (error) {
		console.error('Failed to create database directory:', error);
		throw new Error(`Failed to create database directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

// Ensure the database directory exists before initializing
ensureDatabaseDirectory(DATABASE_PATH);

const sqlite = new Database(DATABASE_PATH);
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

export type DbClient = typeof db;
