const { Kafka } = require('kafkajs');

const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const kafka = new Kafka({ clientId: 'auth-service', brokers });
const producer = kafka.producer();

let connected = false;

async function connectProducer() {
  try {
    await producer.connect();
    connected = true;
    console.log('[auth] kafka producer connected');
  } catch (err) {
    console.warn('[auth] kafka producer connect failed (continuing):', err.message);
  }
}

async function publish(topic, payload) {
  if (!connected) return;
  try {
    await producer.send({ topic, messages: [{ value: JSON.stringify(payload) }] });
  } catch (err) {
    console.warn(`[auth] kafka publish failed (${topic}):`, err.message);
  }
}

module.exports = { connectProducer, publish };
