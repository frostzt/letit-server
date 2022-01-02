import { Upvote } from '../entities/Upvote.entity';
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
    @Ctx() { req }: MyContext,
  ): Promise<PaginatedPosts> {
    const maxLimit = Math.min(50, limit);
    const maxLimitPlus = Math.min(50, limit) + 1;

    const replacements: any[] = [maxLimitPlus];

    if (req.session.userId) {
      replacements.push(req.session.userId);
    }

    let cursorIdx = 3;
    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
      cursorIdx = replacements.length;
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
        ) creator,
      ${
        req.session.userId
          ? '(SELECT value FROM upvote WHERE "userId" = $2 AND "postId" = p.id) "voteStatus"'
          : 'null AS "voteStatus"'
      }
      FROM post p
      INNER JOIN public.user u ON u.id = p."creatorId"
      ${cursor ? `WHERE p."createdAt" < $` + cursorIdx : ''}
      ORDER BY p."createdAt" DESC
      LIMIT $1
    `,
      replacements,
    );

    return { posts: posts.slice(0, maxLimit), hasMore: posts.length === maxLimitPlus };
  }

  /**
   * Returns the post by searching for it via the provided id or null
   * @param id, 'id' of the post that you want
   * @returns Post, the post with the id or null
   */
  @Query(() => Post, { nullable: true })
  post(@Arg('id') id: string): Promise<Post | undefined> {
    return Post.findOne(id, { relations: ['creator'] });
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

  /**
   * Updates the post with either one upvote or one downvote
   * @param postId PostId for the post to be updated with points
   * @param value The count for points
   * @returns bool, weather the post was updated
   */
  @Mutation(() => Boolean)
  @UseMiddleware(requireAuthentication)
  async vote(@Arg('postId') postId: string, @Arg('value', () => Int) value: number, @Ctx() { req }: MyContext) {
    const isUpvote = value !== -1;
    const point = isUpvote ? 1 : -1;
    const userId = req.session.userId;

    const upvote = await Upvote.findOne({ where: { postId, userId } });

    // The user has voted before and they are trying it again
    if (upvote && upvote.value != point) {
      await getConnection().transaction(async (tm) => {
        await tm.query(
          `
          UPDATE upvote
          SET value = $1
          WHERE "postId" = $2 and "userId" = $3
        `,
          [point, postId, userId],
        );

        await tm.query(
          `
          UPDATE post
          SET points = points + $1
          WHERE id = $2;
         `,
          [2 * point, postId],
        );
      });
    } else if (!upvote) {
      // The user has never voted before
      await getConnection().transaction(async (tm) => {
        await tm.query(
          `
          INSERT INTO upvote ("userId", "postId", value)
          values ($1, $2, $3);
        `,
          [userId, postId, point],
        );

        await tm.query(
          `
          UPDATE post
          SET points = points + $1
          WHERE id = $2;
        `,
          [point, postId],
        );
      });
    }

    return true;
  }
}
