const { kafka } = require('./producer');

async function startConsumer() {
  const consumer = kafka.consumer({ groupId: 'review-service' });
  await consumer.connect();
  await consumer.subscribe({ topic: 'anime.completed', fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const evt = JSON.parse(message.value.toString());
        console.log(`[review] anime.completed for user=${evt.user_id} anime=${evt.anime_id} — prompt user to leave a review`);
        // In a real system, this would create a "prompt" record. The notification service
        // gets its own copy of the event and is responsible for messaging the user.
      } catch (e) {
        console.warn('[review] consumer error:', e.message);
      }
    },
  });
  console.log('[review] kafka consumer running');
}

module.exports = { startConsumer };
