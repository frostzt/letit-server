import argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { Arg, Ctx, Mutation, Resolver } from 'type-graphql';

import { User } from '../entities/User.entity';
import { MyContext } from '../types/GqlContext.type';
import { BadArgumentError } from '../graphql/errors/BadArgumentError.error';
import { UsernamePasswordInput } from '../graphql/inputs/user/UsernamePasswordInput.input';

@Resolver()
export class UserResolver {
  /**
   * Creates a new User based on the username and password provided
   * @param data, object containing username and password of the user
   * @returns User, returns the newly created User object
   */
  @Mutation(() => User)
  async register(@Arg('data') data: UsernamePasswordInput, @Ctx() { em }: MyContext): Promise<User> {
    const hashedPassword = await argon2.hash(data.password);
    const user = em.create(User, { id: uuidv4(), username: data.username, password: hashedPassword });
    await em.persistAndFlush(user);

    return user;
  }

  /**
   * Logs the User in based on the username and password provided
   * @param data, object containing username and password of the user
   * @returns User, if verified then returns the user or else an error array
   */
  @Mutation(() => User)
  async login(@Arg('data') data: UsernamePasswordInput, @Ctx() { em }: MyContext): Promise<User> {
    const user = await em.findOne(User, { username: data.username });
    if (!user) {
      throw new BadArgumentError('Invalid credentials');
    }

    const isValid = await argon2.verify(user.password, data.password);
    if (!isValid) {
      throw new BadArgumentError('Invalid credentials');
    }

    return user;
  }
}
