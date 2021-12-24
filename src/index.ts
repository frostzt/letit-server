import dotenv from 'dotenv';
import express from 'express';
import { MikroORM } from '@mikro-orm/core';
import { buildSchema } from 'type-graphql';
import { ApolloServer } from 'apollo-server-express';

import { __prod__ } from './constants';
import mikroOrmConfig from './mikro-orm.config';

dotenv.config({ path: '.env.local' });

const main = async () => {
  const orm = await MikroORM.init(mikroOrmConfig);
  await orm.getMigrator().up();

  const app = express();
  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [],
      validate: false,
    }),
  });
  app.listen(process.env.PORT, () => {
    console.log(`App running on port ${process.env.PORT}`);
  });
};

main();
