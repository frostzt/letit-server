import path from 'path';
import { MikroORM } from '@mikro-orm/core';

import { __prod__ } from './constants';
import { Post } from './entities/Post.entity';
import { User } from './entities/User.entity';

const config = {
  migrations: {
    path: path.join(__dirname, './migrations'),
    pattern: /^[\w-]+\d+\.[jt]s$/,
  },
  entities: [Post, User],
  debug: !__prod__,
  type: 'postgresql',
  user: 'postgres',
  dbName: 'letit',
  password: 'postgres',
} as Parameters<typeof MikroORM.init>[0];

export default config;
