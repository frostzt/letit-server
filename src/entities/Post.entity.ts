import { Field, Int, ObjectType } from 'type-graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Upvote } from './Upvote.entity';
import { User } from './User.entity';

@ObjectType()
@Entity()
export class Post extends BaseEntity {
  @Field(() => String)
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Field(() => String)
  @Column()
  title!: string;

  @Field(() => String)
  @Column()
  content!: string;

  @Field(() => String)
  @Column({ type: 'int', default: 0 })
  points!: number;

  @Field(() => Int, { nullable: true })
  voteStatus: number | null;

  @Field(() => Boolean)
  @Column({ type: 'boolean', default: false })
  pinned: boolean;

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date;

  @Field()
  @ManyToOne(() => User, (user) => user.posts)
  creator: User;

  @Field(() => String)
  @Column()
  creatorId: string;

  @OneToMany(() => Upvote, (upvote) => upvote.post)
  upvotes: Upvote[];
}
