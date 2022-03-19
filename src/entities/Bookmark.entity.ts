import { Field, ObjectType } from 'type-graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Post } from './Post.entity';
import { User } from './User.entity';

@ObjectType()
@Entity()
export class Bookmark extends BaseEntity {
  @Field(() => String)
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date;

  @Field()
  @OneToOne(() => Post)
  @JoinColumn()
  post: Post;

  @Field(() => String)
  @Column()
  postId: string;

  @Field()
  @OneToOne(() => User)
  @JoinColumn()
  user: User;

  @Field(() => String)
  @Column()
  userId: string;
}
