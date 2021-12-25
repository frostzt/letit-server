import argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { Arg, Ctx, Mutation, Query, Resolver } from 'type-graphql';

import { User } from '../entities/User.entity';
import { MyContext } from '../types/GqlContext.type';
import { BadArgumentError } from '../graphql/errors/BadArgumentError.error';
import { DuplicateEntryError } from '../graphql/errors/DuplicateEntryError.error';
import { UsernamePasswordInput } from '../graphql/inputs/user/UsernamePasswordInput.input';

@Resolver()
export class UserResolver {
  /**
   * Fetches the currently logged in user based on the sesssion
   * @returns User, returns the User object or null
   */
  @Query(() => User, { nullable: true })
  async me(@Ctx() { req, em }: MyContext): Promise<User | null> {
    if (!req.session.userId) {
      return null;
    }

    const user = await em.findOne(User, { id: req.session.userId });
    return user;
  }

  /**
   * Creates a new User based on the username and password provided
   * @param data, object containing username and password of the user
   * @returns User, returns the newly created User object
   */
  @Mutation(() => User)
  async register(@Arg('data') data: UsernamePasswordInput, @Ctx() { em, req }: MyContext): Promise<User | undefined> {
    let user;
    try {
      const hashedPassword = await argon2.hash(data.password);
      user = em.create(User, { id: uuidv4(), username: data.username, password: hashedPassword });
      await em.persistAndFlush(user);

      // Log the user in
      req.session.userId = user.id;
      return user;
    } catch (error) {
      if (error.code === '23505') {
        throw new DuplicateEntryError('Username is already taken!');
      }
    }

    return user;
  }

  /**
   * Logs the User in based on the username and password provided
   * @param data, object containing username and password of the user
   * @returns User, if verified then returns the user or else an error array
   */
  @Mutation(() => User)
  async login(@Arg('data') data: UsernamePasswordInput, @Ctx() { em, req }: MyContext): Promise<User> {
    const user = await em.findOne(User, { username: data.username });
    if (!user) {
      throw new BadArgumentError('Invalid credentials');
    }

    const isValid = await argon2.verify(user.password, data.password);
    if (!isValid) {
      throw new BadArgumentError('Invalid credentials');
    }

    // Log the user in
    req.session.userId = user.id;
    return user;
  }
}
