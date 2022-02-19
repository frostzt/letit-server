import { MiddlewareFn } from 'type-graphql';
import { ApolloError } from 'apollo-server-express';

import { MyContext } from '../types/GqlContext.type';

export const requireAuthentication: MiddlewareFn<MyContext> = ({ context }, next) => {
  if (!context.req.session.userId) {
    throw new ApolloError("You're not authenticated, please login!", 'NOT_AUTHORIZED');
  }

  return next();
};
