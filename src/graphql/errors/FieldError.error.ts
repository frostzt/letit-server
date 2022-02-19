import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class PropertyError {
  @Field(() => String, { nullable: true })
  property?: string;

  @Field()
  message: string;
}
