import { Field, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { Post } from './Post.entity';
import { User } from './User.entity';

@ObjectType()
@Entity()
export class Upvote extends BaseEntity {
  @Field()
  @Column({ type: 'int' })
  value: number;

  @Field(() => String)
  @PrimaryColumn()
  userId: string;

  @Field(() => User)
  @ManyToOne(() => User, (user) => user.upvotes)
  user: User;

  @Field(() => String)
  @PrimaryColumn()
  postId: string;

  @Field(() => Post)
  @ManyToOne(() => Post, (post) => post.upvotes, { onDelete: 'CASCADE' })
  post: Post;
}
