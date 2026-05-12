const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const handlers = require('./handlers');
const { connectProducer } = require('./kafka/producer');
const { startConsumer } = require('./kafka/consumer');

const PROTO_DIR = process.env.PROTO_DIR || path.join(__dirname, '..', '..', '..', 'proto');
const proto = grpc.loadPackageDefinition(
  protoLoader.loadSync(path.join(PROTO_DIR, 'watchlist.proto'), {
    keepCase: false, longs: String, enums: String, defaults: true, oneofs: true,
  })
).watchlist;

async function main() {
  await connectProducer();
  startConsumer().catch((e) => console.warn('[watchlist] consumer failed:', e.message));

  const server = new grpc.Server();
  server.addService(proto.WatchlistService.service, handlers);

  const port = process.env.GRPC_PORT || '50053';
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, p) => {
    if (err) { console.error('[watchlist] bind failed', err); process.exit(1); }
    console.log(`[watchlist] gRPC server listening on ${p}`);
  });
}

main().catch((e) => { console.error('[watchlist] fatal', e); process.exit(1); });
