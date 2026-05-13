const { kafka } = require('./producer');
const { db } = require('../db');

async function startConsumer() {
  const consumer = kafka.consumer({ groupId: 'watchlist-service' });
  await consumer.connect();
  await consumer.subscribe({ topic: 'episode.published', fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const evt = JSON.parse(message.value.toString());
        console.log('[watchlist] episode.published received for anime', evt.anime_id);
        const instance = await db;
        const subs = await instance.watchlist.find({ selector: { anime_id: evt.anime_id } }).exec();
        console.log(`[watchlist] ${subs.length} users follow this anime`);
      } catch (e) {
        console.warn('[watchlist] consumer error:', e.message);
      }
    },
  });
  console.log('[watchlist] kafka consumer running');
}

module.exports = { startConsumer };
