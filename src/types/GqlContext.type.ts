import { Redis } from 'ioredis';
import session from 'express-session';
import { Request, Response } from 'express';
import { createUserLoader } from 'src/utils/loaders/createUserLoader';
import { createUpvoteLoader } from 'src/utils/loaders/createUpvoteLoader';

interface ISession {
  userId?: string;
}

export type MyContext = {
  req: Request & { session: session.Session & Partial<session.SessionData> & ISession };
  res: Response;
  redis: Redis;
  userLoader: ReturnType<typeof createUserLoader>;
  upvoteLoader: ReturnType<typeof createUpvoteLoader>;
};
