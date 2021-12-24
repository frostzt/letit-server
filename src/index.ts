import dotenv from 'dotenv';
dotenv.config({ path: `${process.cwd()}/.env.local` });

import util from 'util';
import 'reflect-metadata';
import express from 'express';
import { MikroORM } from '@mikro-orm/core';
import { ArgumentValidationError, buildSchema } from 'type-graphql';
import { ApolloServer, ApolloError } from 'apollo-server-express';
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';

import logger from './utils/logger';
import { __prod__ } from './constants';
import mikroOrmConfig from './mikro-orm.config';

// Resolvers
import { PostResolver } from './resolvers/posts.resolver';
import { UserResolver } from './resolvers/users.resolver';
import { GraphQLError } from 'graphql';

const main = async () => {
  const orm = await MikroORM.init(mikroOrmConfig);
  await orm.getMigrator().up();

  const app = express();
  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [PostResolver, UserResolver],
      validate: true,
    }),
    context: () => ({ em: orm.em }),
    plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
    formatError: (error: GraphQLError) => {
      // Handles ApolloErrors that are NOT resolver errors
      if (error.originalError instanceof ApolloError) {
        return error;
      }

      // Only thrown by 'class-validator' incase the class validation fails
      if (error.originalError instanceof ArgumentValidationError) {
        const obj = error.originalError.validationErrors[0].constraints;
        let message = '';
        for (let i in obj) {
          message = obj[i];
        }

        return { message, path: error.path, extensions: error.extensions };
      }

      // Log unhandled errors
      logger.error(error);
      console.log(util.inspect(error, { showHidden: false, depth: null, colors: true }));

      return new GraphQLError("Seems like something messed up, we're on it!");
    },
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({ app });
  app.listen(process.env.PORT, () => {
    logger.info(`App running on port ${process.env.PORT}`);
  });
};

main();
