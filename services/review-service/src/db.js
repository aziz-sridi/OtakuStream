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

const reviewSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 50 },
    user_id: { type: 'string', maxLength: 100 },
    anime_id: { type: 'string', maxLength: 100 },
    rating: { type: 'number', minimum: 1, maximum: 10, multipleOf: 1 },
    body: { type: 'string', maxLength: 5000 },
    likes: { type: 'number', minimum: 0, maximum: 1e9, multipleOf: 1 },
    likedBy: { type: 'array', items: { type: 'string', maxLength: 100 } },
    created_at: { type: 'string', maxLength: 30 },
  },
  required: ['id', 'user_id', 'anime_id', 'rating', 'created_at'],
  indexes: ['anime_id', 'created_at'],
};

const db = (async () => {
  const instance = await createRxDatabase({
    name: 'review',
    storage: getRxStorageMemory(),
    ignoreDuplicate: true,
  });
  await instance.addCollections({
    reviews: { schema: reviewSchema },
  });

  if (fs.existsSync(DUMP_FILE)) {
    try {
      const dump = JSON.parse(fs.readFileSync(DUMP_FILE, 'utf8'));
      await instance.importJSON(dump);
      console.log('[review] restored rxdb state from', DUMP_FILE);
    } catch (e) {
      console.warn('[review] could not restore rxdb dump:', e.message);
    }
  }

  const flush = async () => {
    try {
      const dump = await instance.exportJSON();
      fs.writeFileSync(DUMP_FILE, JSON.stringify(dump));
    } catch (e) {
      console.warn('[review] rxdb flush failed:', e.message);
    }
  };
  const flushAndExit = async (signal) => { await flush(); if (signal) process.exit(0); };
  process.on('SIGTERM', () => flushAndExit('SIGTERM'));
  process.on('SIGINT', () => flushAndExit('SIGINT'));
  process.on('beforeExit', () => flush());

  return instance;
})();

module.exports = { db };
