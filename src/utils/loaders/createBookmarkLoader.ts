import DataLoader from 'dataloader';
import { Bookmark } from '../../entities/Bookmark.entity';

export const createBookmarkLoader = () =>
  new DataLoader<{ postId: string; userId: string }, Bookmark | null>(async (keys) => {
    const bookmarks = await Bookmark.findByIds(keys as any);
    const bookmarkIdsToBookmark: Record<string, Bookmark> = {};
    bookmarks.forEach((bookmark) => {
      bookmarkIdsToBookmark[`${bookmark.userId}|${bookmark.postId}`] = bookmark;
    });

    return keys.map((key) => bookmarkIdsToBookmark[`${key.userId}|${key.postId}`]);
  });
