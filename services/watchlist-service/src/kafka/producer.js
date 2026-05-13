const { Kafka } = require('kafkajs');

const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const kafka = new Kafka({ clientId: 'watchlist-service', brokers });
const producer = kafka.producer();
let connected = false;

async function connectProducer() {
  try {
    await producer.connect();
    connected = true;
    console.log('[watchlist] kafka producer connected');
  } catch (e) {
    console.warn('[watchlist] kafka producer connect failed:', e.message);
  }
}

async function publish(topic, payload) {
  if (!connected) return;
  try {
    await producer.send({ topic, messages: [{ value: JSON.stringify(payload) }] });
  } catch (e) {
    console.warn(`[watchlist] kafka publish failed (${topic}):`, e.message);
  }
}

module.exports = { connectProducer, publish, kafka };
