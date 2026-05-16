const { Kafka } = require('kafkajs');
const { v4: uuid } = require('uuid');
const { db } = require('../db');

const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const kafka = new Kafka({ clientId: 'notification-service', brokers });

const TOPICS = ['user.registered', 'episode.published', 'progress.updated', 'review.posted'];

async function createNotification({ user_id, type, title, body }) {
  if (!user_id) return;
  const instance = await db;
  await instance.notifications.insert({
    id: uuid(),
    user_id,
    type,
    title,
    body,
    read: false,
    created_at: new Date().toISOString(),
  });
}

async function handle(topic, evt) {
  switch (topic) {
    case 'user.registered':
      await createNotification({
        user_id: evt.user_id, type: 'welcome',
        title: 'Welcome to OtakuStream',
        body: `Hi ${evt.username}, your account is ready.`,
      });
      break;
    case 'episode.published':
      console.log(`[notification] episode.published anime=${evt.anime_id} ep=${evt.number}`);
      break;
    case 'progress.updated':
      if (evt.completed) {
        await createNotification({
          user_id: evt.user_id, type: 'progress',
          title: 'Anime completed',
          body: `You finished ${evt.anime_id}. Leave a review!`,
        });
      }
      break;
    case 'review.posted':
      await createNotification({
        user_id: evt.user_id, type: 'review',
        title: 'Review posted',
        body: `Your review for ${evt.anime_id} was published.`,
      });
      break;
  }
}

async function startConsumer() {
  const consumer = kafka.consumer({ groupId: 'notification-service' });
  await consumer.connect();
  for (const t of TOPICS) await consumer.subscribe({ topic: t, fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const evt = JSON.parse(message.value.toString());
        await handle(topic, evt);
      } catch (e) {
        console.warn(`[notification] handler error on ${topic}:`, e.message);
      }
    },
  });
  console.log(`[notification] kafka consumer subscribed to ${TOPICS.join(', ')}`);
}

module.exports = { startConsumer };
