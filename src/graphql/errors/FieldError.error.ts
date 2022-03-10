import { Field, ObjectType } from 'type-graphql';
import { ErrorCodes } from './errorCodes';

@ObjectType()
export class PropertyError {
  @Field(() => String, { nullable: true })
  property?: string;

  @Field(() => String, { nullable: true })
  errorCode?: ErrorCodes;

  @Field()
  message: string;
}
