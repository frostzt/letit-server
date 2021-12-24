import path from 'path';
import { MikroORM } from '@mikro-orm/core';

import { __prod__ } from './constants';
import { Post } from './entities/Post.entity';

const config = {
  migrations: {
    path: path.join(__dirname, './migrations'),
    pattern: /^[\w-]+\d+\.[jt]s$/,
  },
  entities: [Post],
  debug: !__prod__,
  type: process.env.type,
  user: process.env.user,
  dbName: process.env.dbName,
  password: process.env.password,
} as Parameters<typeof MikroORM.init>[0];

export default config;
