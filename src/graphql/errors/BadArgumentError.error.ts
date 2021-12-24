import { ApolloError } from 'apollo-server-express';

export class BadArgumentError extends ApolloError {
  constructor(message: string) {
    super(message, 'BAD_ARGUMENT_ERROR');

    Object.defineProperty(this, 'BAD_ARGUMENT_ERROR', { value: message });
  }
}
