import { Ctx, Query, Resolver } from 'type-graphql';

import { Post } from '../entities/Post.entity';
import { MyContext } from '../types/GqlContext.type';

@Resolver()
export class PostResolver {
  @Query(() => [Post])
  posts(@Ctx() { em }: MyContext): Promise<Post[]> {
    return em.find(Post, {});
  }
}
