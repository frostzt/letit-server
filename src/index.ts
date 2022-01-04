import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';
import { ApolloError, ApolloServer } from 'apollo-server-express';
import connectRedis from 'connect-redis';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import { GraphQLError } from 'graphql';
import Redis from 'ioredis';
import path from 'path';
import 'reflect-metadata';
import { buildSchema } from 'type-graphql';
import { createConnection } from 'typeorm';
import util from 'util';
import { COOKIE_NAME, __prod__ } from './constants';
import { Post } from './entities/Post.entity';
import { Upvote } from './entities/Upvote.entity';
import { User } from './entities/User.entity';
import { PostResolver } from './resolvers/posts.resolver';
import { UserResolver } from './resolvers/users.resolver';
import { MyContext } from './types/GqlContext.type';
import { createUpvoteLoader } from './utils/loaders/createUpvoteLoader';
import { createUserLoader } from './utils/loaders/createUserLoader';
import logger from './utils/logger';
dotenv.config({ path: `${process.cwd()}/.env` });

const main = async () => {
  const conn = await createConnection({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    logging: !__prod__,
    synchronize: !__prod__,
    migrations: [path.join(__dirname, './migrations/*')],
    entities: [User, Post, Upvote],
    ssl: { rejectUnauthorized: false },
  });

  await conn.runMigrations();

  const app = express();

  const RedisStore = connectRedis(session);
  const redis = new Redis(process.env.REDIS_TLS_URL);

  app.set('proxy', 1);
  app.use(cors({ credentials: true, origin: process.env.ORIGIN }));
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
        domain: __prod__ ? '.herokuapp.com' : undefined,
      },
    }),
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }): MyContext => ({
      req,
      res,
      redis,
      userLoader: createUserLoader(),
      upvoteLoader: createUpvoteLoader(),
    }),
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
  app.listen(parseInt(process.env.PORT!), () => {
    logger.info(`App running on port ${process.env.PORT}`);
  });
};

main();
