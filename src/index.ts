import dotenv from 'dotenv';
dotenv.config({ path: `${process.cwd()}/.env.local` });

import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';
import { ApolloError, ApolloServer } from 'apollo-server-express';
import connectRedis from 'connect-redis';
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import { GraphQLError } from 'graphql';
import Redis from 'ioredis';
import 'reflect-metadata';
import { buildSchema } from 'type-graphql';
import { createConnection } from 'typeorm';
import util from 'util';
import { COOKIE_NAME, __prod__ } from './constants';
import { Post } from './entities/Post.entity';
import { User } from './entities/User.entity';
import { PostResolver } from './resolvers/posts.resolver';
import { UserResolver } from './resolvers/users.resolver';
import { MyContext } from './types/GqlContext.type';
import logger from './utils/logger';
import path from 'path';

const main = async () => {
  await createConnection({
    type: 'postgres',
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    logging: true,
    synchronize: true,
    migrations: [path.join(__dirname, './migrations/*')],
    entities: [User, Post],
  });

  const app = express();

  const RedisStore = connectRedis(session);
  const redis = new Redis();

  app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));
  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({ client: redis, disableTouch: true }),
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
    context: ({ req, res }): MyContext => ({ req, res, redis }),
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
