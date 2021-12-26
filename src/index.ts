import dotenv from 'dotenv';
dotenv.config({ path: `${process.cwd()}/.env.local` });

import cors from 'cors';
import util from 'util';
import 'reflect-metadata';
import express from 'express';
import * as redis from 'redis';
import session from 'express-session';
import { GraphQLError } from 'graphql';
import connectRedis from 'connect-redis';
import { buildSchema } from 'type-graphql';
import { MikroORM } from '@mikro-orm/core';
import { ApolloServer, ApolloError } from 'apollo-server-express';
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';

import logger from './utils/logger';
import mikroOrmConfig from './mikro-orm.config';
import { MyContext } from './types/GqlContext.type';
import { COOKIE_NAME, __prod__ } from './constants';

// Resolvers
import { PostResolver } from './resolvers/posts.resolver';
import { UserResolver } from './resolvers/users.resolver';

const main = async () => {
  const orm = await MikroORM.init(mikroOrmConfig);
  await orm.getMigrator().up();

  const app = express();

  const RedisStore = connectRedis(session);
  const redisClient = redis.createClient({
    legacyMode: true,
  });
  await redisClient.connect();

  app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));
  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({ client: redisClient, disableTouch: true }),
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
        secure: __prod__,
        sameSite: 'lax',
      },
    }),
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }): MyContext => ({ em: orm.em, req, res }),
    plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
    formatError: (error: GraphQLError) => {
      // Handles ApolloErrors that are NOT resolver errors
      if (error.originalError instanceof ApolloError) {
        return error;
      }

      // Log unhandled errors
      logger.error(error);
      console.log(util.inspect(error, { showHidden: false, depth: null, colors: true }));

      return new GraphQLError("Seems like something messed up, we're on it!");
    },
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({ app, cors: false });
  app.listen(process.env.PORT, () => {
    logger.info(`App running on port ${process.env.PORT}`);
  });
};

main();
