const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { initDb, seedIfEmpty } = require('./db');
const handlers = require('./handlers');
const { connectProducer } = require('./kafka/producer');

const PROTO_DIR = process.env.PROTO_DIR || path.join(__dirname, '..', '..', '..', 'proto');
const proto = grpc.loadPackageDefinition(
  protoLoader.loadSync(path.join(PROTO_DIR, 'catalog.proto'), {
    keepCase: false, longs: String, enums: String, defaults: true, oneofs: true,
  })
).catalog;

async function main() {
  initDb();
  seedIfEmpty();
  await connectProducer();

  const server = new grpc.Server();
  server.addService(proto.CatalogService.service, handlers);

  const port = process.env.GRPC_PORT || '50052';
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, p) => {
    if (err) { console.error('[catalog] bind failed', err); process.exit(1); }
    console.log(`[catalog] gRPC server listening on ${p}`);
  });
}

main().catch((e) => { console.error('[catalog] fatal', e); process.exit(1); });
