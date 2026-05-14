const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_DIR = process.env.PROTO_DIR || path.join(__dirname, '..', '..', '..', 'proto');

function load(file, pkgName) {
  const def = protoLoader.loadSync(path.join(PROTO_DIR, file), {
    keepCase: false, longs: String, enums: String, defaults: true, oneofs: true,
  });
  return grpc.loadPackageDefinition(def)[pkgName];
}

const authPkg = load('auth.proto', 'auth');
const catalogPkg = load('catalog.proto', 'catalog');
const watchlistPkg = load('watchlist.proto', 'watchlist');
const reviewPkg = load('review.proto', 'review');
const notificationPkg = load('notification.proto', 'notification');

const creds = grpc.credentials.createInsecure();

const auth = new authPkg.AuthService(process.env.AUTH_GRPC || 'localhost:50051', creds);
const catalog = new catalogPkg.CatalogService(process.env.CATALOG_GRPC || 'localhost:50052', creds);
const watchlist = new watchlistPkg.WatchlistService(process.env.WATCHLIST_GRPC || 'localhost:50053', creds);
const review = new reviewPkg.ReviewService(process.env.REVIEW_GRPC || 'localhost:50054', creds);
const notification = new notificationPkg.NotificationService(process.env.NOTIFICATION_GRPC || 'localhost:50055', creds);

function promisify(client, method) {
  return (request) => new Promise((resolve, reject) => {
    client[method](request, (err, res) => (err ? reject(err) : resolve(res)));
  });
}

function wrap(client) {
  const out = {};
  for (const m of Object.keys(Object.getPrototypeOf(client))) {
    if (typeof client[m] === 'function' && !m.startsWith('$') && m !== 'constructor') {
      out[m] = promisify(client, m);
    }
  }
  return out;
}

module.exports = {
  auth: wrap(auth),
  catalog: wrap(catalog),
  watchlist: wrap(watchlist),
  review: wrap(review),
  notification: wrap(notification),
};
