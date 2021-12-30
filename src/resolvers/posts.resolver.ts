import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from 'type-graphql';
import { getConnection } from 'typeorm';
import { Post } from '../entities/Post.entity';
import { PropertyError } from '../graphql/errors/FieldError.error';
import { requireAuthentication } from '../middlewares/requireAuthentication';
import { MyContext } from '../types/GqlContext.type';
import { validLength } from '../utils/vaildators/propertyValidation.validator';

@ObjectType()
class PostResponse {
  @Field(() => Post, { nullable: true })
  post?: Post;

  @Field(() => [PropertyError], { nullable: true })
  errors?: PropertyError[];
}

@InputType()
class PostInput {
  @Field()
  title: string;

  @Field()
  content: string;
}

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];

  @Field()
  hasMore: boolean;
}

@Resolver(Post)
export class PostResolver {
  /**
   * Creates a contentSnippet property everytime a Post is created
   * contentSnippet contains the first 50 characters of a post
   */
  @FieldResolver(() => String)
  contentSnippet(@Root() root: Post) {
    return root.content.slice(0, 50);
  }

  /**
   * List all the posts that are available in the database
   * @returns Post[], containing all the posts
   */
  @Query(() => PaginatedPosts)
  async posts(
    @Arg('limit', () => Int) limit: number,
    @Arg('cursor', () => String, { nullable: true }) cursor: string | null,
  ): Promise<PaginatedPosts> {
    const maxLimit = Math.min(50, limit);
    const maxLimitPlus = Math.min(50, limit) + 1;

    const replacements: any[] = [maxLimitPlus];

    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
    }

    const posts = await getConnection().query(
      `
      SELECT p.*,
      json_build_object(
        'username', u.username, 
        'id', u.id, 
        'email', u.email,
        'createdAt', u."createdAt",
        'updatedAt', u."updatedAt"
        ) creator
      FROM post p
      INNER JOIN public.user u ON u.id = p."creatorId"
      ${cursor ? `WHERE p."createdAt" < $2` : ''}
      ORDER BY p."createdAt" DESC
      LIMIT $1
    `,
      replacements,
    );

    // const queryBuilder = getConnection()
    //   .getRepository(Post)
    //   .createQueryBuilder('post')
    //   .innerJoinAndSelect('post.creator', 'user', 'user.id = post."creatorId"')
    //   .orderBy('post."createdAt"', 'DESC')
    //   .take(maxLimitPlus);
    console.log(posts);

    return { posts: posts.slice(0, maxLimit), hasMore: posts.length === maxLimitPlus };
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
  @Mutation(() => PostResponse)
  @UseMiddleware(requireAuthentication)
  async createPost(@Arg('data') data: PostInput, @Ctx() { req }: MyContext): Promise<PostResponse> {
    if (!validLength({ str: data.title, min: 5 })) {
      return { errors: [{ message: 'Title should be longer than 5 characters!', property: 'title' }] };
    }

    const post = await Post.create({
      ...data,
      creatorId: req.session.userId,
    }).save();

    return { post };
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
