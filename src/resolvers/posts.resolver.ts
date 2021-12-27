import { Arg, Int, Mutation, Query, Resolver } from 'type-graphql';

import { Post } from '../entities/Post.entity';

@Resolver()
export class PostResolver {
  /**
   * List all the posts that are available in the database
   * @returns Post[], containing all the posts
   */
  @Query(() => [Post])
  posts(): Promise<Post[]> {
    return Post.find();
  }

  /**
   * Returns the post by searching for it via the provided id or null
   * @param id, 'id' of the post that you want
   * @returns Post, the post with the id or null
   */
  @Query(() => Post, { nullable: true })
  post(@Arg('id', () => Int) id: string): Promise<Post | undefined> {
    return Post.findOne(id);
  }

  /**
   * Creates a new Post based on the title provided and returns it
   * @param title, title of the post that you want to create
   * @returns Post, returns the newly created post
   */
  @Mutation(() => Post)
  async createPost(@Arg('title') title: string): Promise<Post> {
    return Post.create({ title }).save();
  }

  /**
   * Updates a post with the title provided by the user, id of the post is required or null
   * @param title, Updated title of the post
   * @param id, Id of the post that you want to update
   * @returns Post, updated post is returned if the post does not exist then null
   */
  @Mutation(() => Post, { nullable: true })
  async updatePost(@Arg('title') title: string, @Arg('id') id: string): Promise<Post | null> {
    const post = await Post.findOne(id);
    if (!post) {
      return null;
    }

    if (typeof title !== undefined) {
      await Post.update({ id }, { title });
    }

    return post;
  }

  /**
   * Deletes a post with the id provided by the user
   * @param id, Id of the post that you want to delete
   * @returns bool, weather the post was deleted or not
   */
  @Mutation(() => Boolean)
  async deletePost(@Arg('id') id: string): Promise<boolean> {
    await Post.delete(id);
    return true;
  }
}
