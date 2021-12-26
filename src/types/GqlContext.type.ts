import { Redis } from 'ioredis';
import session from 'express-session';
import { Request, Response } from 'express';
import { Connection, EntityManager, IDatabaseDriver } from '@mikro-orm/core';

interface ISession {
  userId?: string;
}

export type MyContext = {
  em: EntityManager<IDatabaseDriver<Connection>>;
  req: Request & { session: session.Session & Partial<session.SessionData> & ISession };
  res: Response;
  redis: Redis;
};
