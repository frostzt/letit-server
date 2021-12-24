import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import 'reflect-metadata';
import express from 'express';
import { MikroORM } from '@mikro-orm/core';
import { buildSchema } from 'type-graphql';
import { ApolloServer } from 'apollo-server-express';
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';

import logger from './utils/logger';
import { __prod__ } from './constants';
import mikroOrmConfig from './mikro-orm.config';

// Resolvers
import { PostResolver } from './resolvers/posts.resolver';

const main = async () => {
  const orm = await MikroORM.init(mikroOrmConfig);
  await orm.getMigrator().up();

  const app = express();
  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [PostResolver],
      validate: false,
    }),
    context: () => ({ em: orm.em }),
    plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
  });
  await apolloServer.start();
  apolloServer.applyMiddleware({ app });
  app.listen(process.env.PORT, () => {
    logger.info(`App running on port ${process.env.PORt}`);
  });
};

main();
