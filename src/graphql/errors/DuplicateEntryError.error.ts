import { ApolloError } from 'apollo-server-express';

export class DuplicateEntryError extends ApolloError {
  constructor(message: string) {
    super(message, 'DUPLICATE_ENTRY_ERROR');

    Object.defineProperty(this, 'DUPLICATE_ENTRY_ERROR', { value: message });
  }
}
