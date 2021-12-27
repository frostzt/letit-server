import { Redis } from 'ioredis';
import session from 'express-session';
import { Request, Response } from 'express';

interface ISession {
  userId?: string;
}

export type MyContext = {
  req: Request & { session: session.Session & Partial<session.SessionData> & ISession };
  res: Response;
  redis: Redis;
};
