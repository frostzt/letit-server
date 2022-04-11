import { Redis } from 'ioredis';
import session from 'express-session';
import { Request, Response } from 'express';
import { createUserLoader } from 'src/utils/loaders/createUserLoader';
import { createUpvoteLoader } from 'src/utils/loaders/createUpvoteLoader';
import { createBookmarkLoader } from 'src/utils/loaders/createBookmarkLoader';

interface ISession {
  userId?: string;
}

export type MyContext = {
  req: Request & { session: session.Session & Partial<session.SessionData> & ISession };
  res: Response;
  redis: Redis;
  bookmarkLoader: ReturnType<typeof createBookmarkLoader>;
  userLoader: ReturnType<typeof createUserLoader>;
  upvoteLoader: ReturnType<typeof createUpvoteLoader>;
};
