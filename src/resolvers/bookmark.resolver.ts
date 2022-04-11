import { Arg, Ctx, Field, Int, Mutation, ObjectType, Query, Resolver, UseMiddleware } from 'type-graphql';
import { getConnection } from 'typeorm';
import { Bookmark } from '../entities/Bookmark.entity';
import { Post } from '../entities/Post.entity';
import { PropertyError } from '../graphql/errors/FieldError.error';
import { requireAuthentication } from '../middlewares/requireAuthentication';
import { MyContext } from '../types/GqlContext.type';

@ObjectType()
class BookmarkWithError {
  @Field(() => Boolean, { nullable: true })
  operation?: boolean;

  @Field(() => [PropertyError], { nullable: true })
  errors?: PropertyError[];
}

@ObjectType()
class BookmarkWithPost {
  @Field()
  id: String;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field()
  postId: string;

  @Field()
  userId: string;

  @Field()
  username: string;

  @Field()
  title: string;

  @Field()
  points: number;
}

@ObjectType()
class PaginatedBookmarkedPosts {
  @Field(() => [BookmarkWithPost])
  booksmarkedPosts: BookmarkWithPost[];

  @Field()
  hasMore: boolean;
}

@Resolver(Bookmark)
export class BookmarkResolver {
  /**
   * Creates a bookmark with the postId provided by the user
   * @returns either bookmark object if successful or errors object
   */
  @Mutation(() => BookmarkWithError)
  @UseMiddleware(requireAuthentication)
  async createBookmark(@Arg('postId') postId: string, @Ctx() { req }: MyContext): Promise<BookmarkWithError> {
    if (!postId) {
      return {
        errors: [{ message: 'Seems like there was some problem with the post you provided. Please try again!' }],
      };
    }

    const postExists = await Post.findOne(postId);
    if (!postExists) {
      return {
        errors: [{ message: "Seems like this post doesn't exist!" }],
      };
    }

    const bookmarkExists = await Bookmark.findOne({ where: { postId, userId: req.session.userId } });
    if (bookmarkExists) {
      await Bookmark.delete({ postId, userId: req.session.userId });
    } else {
      await Bookmark.create({ postId, userId: req.session.userId }).save();
    }

    return { operation: true };
  }

  /**
   * Returns the BookmarkedPosts
   * @returns bookmarked posts by the user
   */
  @Query(() => PaginatedBookmarkedPosts)
  @UseMiddleware(requireAuthentication)
  async getBookmarkedPosts(
    @Arg('limit', () => Int) limit: number,
    @Arg('cursor', () => String, { nullable: true }) cursor: string | null,
    @Ctx() { req }: MyContext,
  ): Promise<PaginatedBookmarkedPosts> {
    const maxLimit = Math.min(50, limit);
    const maxLimitPlus = Math.min(50, limit) + 1;

    const replacements: any[] = [maxLimitPlus];

    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
    }

    const bookmarks = await getConnection().query(
      `
      SELECT b.*, u.username, p.title, p.points
        FROM bookmark b
        JOIN public.user u
        ON b."userId" = u.id
        JOIN public.post p
        ON b."postId" = p.id
        WHERE u.id = '${req.session.userId}'
        ORDER BY b."createdAt" DESC
        ${cursor ? `WHERE p."createdAt" < $2` : ''}
        LIMIT $1
    `,
      replacements,
    );

    return { booksmarkedPosts: bookmarks.slice(0, maxLimit), hasMore: bookmarks.length === maxLimitPlus };
  }
}
