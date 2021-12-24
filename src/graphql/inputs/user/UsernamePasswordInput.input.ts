import { IsString, Length } from 'class-validator';
import { Field, InputType } from 'type-graphql';

@InputType()
export class UsernamePasswordInput {
  @Field()
  @Length(2)
  @IsString()
  username: string;

  @Field()
  @Length(8, 32)
  password: string;
}
