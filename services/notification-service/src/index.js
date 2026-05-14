const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const handlers = require('./handlers');
const { startConsumer } = require('./kafka/consumer');

const PROTO_DIR = process.env.PROTO_DIR || path.join(__dirname, '..', '..', '..', 'proto');
const proto = grpc.loadPackageDefinition(
  protoLoader.loadSync(path.join(PROTO_DIR, 'notification.proto'), {
    keepCase: false, longs: String, enums: String, defaults: true, oneofs: true,
  })
).notification;

async function main() {
  startConsumer().catch((e) => console.warn('[notification] consumer failed:', e.message));

  const server = new grpc.Server();
  server.addService(proto.NotificationService.service, handlers);

  const port = process.env.GRPC_PORT || '50055';
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, p) => {
    if (err) { console.error('[notification] bind failed', err); process.exit(1); }
    console.log(`[notification] gRPC server listening on ${p}`);
  });
}

main().catch((e) => { console.error('[notification] fatal', e); process.exit(1); });
