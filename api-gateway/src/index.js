const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');

const restRouter = require('./rest');
const { typeDefs } = require('./graphql/schema');
const { resolvers } = require('./graphql/resolvers');
const clients = require('./grpc-clients');

async function main() {
  const app = express();
  app.use(cors());
  app.use(bodyParser.json());

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api', restRouter);

  const apollo = new ApolloServer({ typeDefs, resolvers });
  await apollo.start();
  app.use(
    '/graphql',
    expressMiddleware(apollo, {
      context: async ({ req }) => {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;
        if (!token) return {};
        try {
          const { valid, user_id, username } = await clients.auth.ValidateToken({ token });
          return valid ? { user: { id: user_id, username } } : {};
        } catch { return {}; }
      },
    })
  );

  app.use((err, _req, res, _next) => {
    console.error('[gateway] error', err);
    res.status(500).json({ error: err.message || 'internal error' });
  });

  const port = parseInt(process.env.PORT) || 4000;
  app.listen(port, () => {
    console.log(`[gateway] REST on http://localhost:${port}/api`);
    console.log(`[gateway] GraphQL on http://localhost:${port}/graphql`);
  });
}

main().catch((e) => { console.error('[gateway] fatal', e); process.exit(1); });
