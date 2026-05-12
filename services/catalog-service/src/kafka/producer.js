const { Kafka } = require('kafkajs');

const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const kafka = new Kafka({ clientId: 'catalog-service', brokers });
const producer = kafka.producer();
let connected = false;

async function connectProducer() {
  try {
    await producer.connect();
    connected = true;
    console.log('[catalog] kafka producer connected');
  } catch (err) {
    console.warn('[catalog] kafka producer connect failed:', err.message);
  }
}

async function publish(topic, payload) {
  if (!connected) return;
  try {
    await producer.send({ topic, messages: [{ value: JSON.stringify(payload) }] });
  } catch (err) {
    console.warn(`[catalog] kafka publish failed (${topic}):`, err.message);
  }
}

module.exports = { connectProducer, publish };
