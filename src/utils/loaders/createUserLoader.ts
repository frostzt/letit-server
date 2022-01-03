import DataLoader from 'dataloader';
import { User } from '../../entities/User.entity';

export const createUserLoader = () =>
  new DataLoader<string, User>(async (ids) => {
    const users = await User.findByIds(ids as string[]);
    const userIdToUsers: Record<string, User> = {};
    users.forEach((u) => {
      userIdToUsers[u.id] = u;
    });

    return ids.map((userId) => userIdToUsers[userId]);
  });
