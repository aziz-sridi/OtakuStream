const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { initDb } = require('./db');
const handlers = require('./handlers');
const { connectProducer } = require('./kafka/producer');

const PROTO_DIR = process.env.PROTO_DIR || path.join(__dirname, '..', '..', '..', 'proto');
const PROTO_PATH = path.join(PROTO_DIR, 'auth.proto');

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const proto = grpc.loadPackageDefinition(packageDef).auth;

async function main() {
  initDb();
  await connectProducer();

  const server = new grpc.Server();
  server.addService(proto.AuthService.service, handlers);

  const port = process.env.GRPC_PORT || '50051';
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
    if (err) {
      console.error('[auth] bind failed', err);
      process.exit(1);
    }
    console.log(`[auth] gRPC server listening on ${boundPort}`);
  });
}

main().catch((err) => {
  console.error('[auth] fatal', err);
  process.exit(1);
});
