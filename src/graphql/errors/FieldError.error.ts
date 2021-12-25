import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class PropertyError {
  @Field()
  property?: string;

  @Field()
  message: string;
}
