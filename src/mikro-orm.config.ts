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
  dbName: 'letit',
  type: 'postgresql',
  debug: !__prod__,
  password: 'postgres',
  user: 'postgres',
} as Parameters<typeof MikroORM.init>[0];

export default config;
