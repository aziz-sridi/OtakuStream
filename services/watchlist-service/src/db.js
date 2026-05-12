const path = require('path');
const fs = require('fs');
const { createRxDatabase, addRxPlugin } = require('rxdb');
const { getRxStorageMemory } = require('rxdb/plugins/storage-memory');
const { RxDBJsonDumpPlugin } = require('rxdb/plugins/json-dump');
const { RxDBQueryBuilderPlugin } = require('rxdb/plugins/query-builder');
const { RxDBUpdatePlugin } = require('rxdb/plugins/update');

addRxPlugin(RxDBJsonDumpPlugin);
addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBUpdatePlugin);

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DUMP_FILE = path.join(DATA_DIR, 'rxdb-dump.json');

const watchlistSchema = {
  version: 0,
  primaryKey: { key: 'id', fields: ['user_id', 'anime_id'], separator: '|' },
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 200 },
    user_id: { type: 'string', maxLength: 100 },
    anime_id: { type: 'string', maxLength: 100 },
    status: { type: 'string', maxLength: 20 },
    added_at: { type: 'string', maxLength: 30 },
  },
  required: ['id', 'user_id', 'anime_id'],
  indexes: ['user_id', 'anime_id'],
};

const progressSchema = {
  version: 0,
  primaryKey: { key: 'id', fields: ['user_id', 'anime_id'], separator: '|' },
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 200 },
    user_id: { type: 'string', maxLength: 100 },
    anime_id: { type: 'string', maxLength: 100 },
    episode_id: { type: 'string', maxLength: 100 },
    position_seconds: { type: 'number', minimum: 0, maximum: 1e9, multipleOf: 1 },
    completed: { type: 'boolean' },
    updated_at: { type: 'string', maxLength: 30 },
  },
  required: ['id', 'user_id', 'anime_id'],
  indexes: ['user_id'],
};

const db = (async () => {
  const instance = await createRxDatabase({
    name: 'watchlist',
    storage: getRxStorageMemory(),
    ignoreDuplicate: true,
  });
  await instance.addCollections({
    watchlist: { schema: watchlistSchema },
    progress: { schema: progressSchema },
  });

  if (fs.existsSync(DUMP_FILE)) {
    try {
      const dump = JSON.parse(fs.readFileSync(DUMP_FILE, 'utf8'));
      await instance.importJSON(dump);
      console.log('[watchlist] restored rxdb state from', DUMP_FILE);
    } catch (e) {
      console.warn('[watchlist] could not restore rxdb dump:', e.message);
    }
  }

  const flush = async () => {
    try {
      const dump = await instance.exportJSON();
      fs.writeFileSync(DUMP_FILE, JSON.stringify(dump));
    } catch (e) {
      console.warn('[watchlist] rxdb flush failed:', e.message);
    }
  };
  const flushAndExit = async (signal) => { await flush(); if (signal) process.exit(0); };
  process.on('SIGTERM', () => flushAndExit('SIGTERM'));
  process.on('SIGINT', () => flushAndExit('SIGINT'));
  process.on('beforeExit', () => flush());

  return instance;
})();

module.exports = { db };
