import argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { EntityManager } from '@mikro-orm/postgresql';
import { Arg, Ctx, Field, Mutation, ObjectType, Query, Resolver } from 'type-graphql';

import { COOKIE_NAME } from '../constants';
import { User } from '../entities/User.entity';
import { MyContext } from '../types/GqlContext.type';
import { PropertyError } from '../graphql/errors/FieldError.error';
import { validEmail, validLength } from '../utils/vaildators/propertyValidation.validator';
import { UsernamePasswordInput } from '../graphql/inputs/user/UsernamePasswordInput.input';

@ObjectType()
class UserResponse {
  @Field(() => User, { nullable: true })
  user?: User;

  @Field(() => [PropertyError], { nullable: true })
  errors?: PropertyError[];
}

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
  @Mutation(() => UserResponse)
  async register(@Arg('data') data: UsernamePasswordInput, @Ctx() { em, req }: MyContext): Promise<UserResponse> {
    // Validations
    if (!validLength({ str: data.username, min: 3 })) {
      return { errors: [{ message: 'Username must be longer than 3 characters', property: 'username' }] };
    }

    if (!validLength({ str: data.password, min: 8, max: 32 })) {
      return { errors: [{ message: 'Password must be between 8 and 32 characters', property: 'password' }] };
    }

    if (!validEmail({ str: data.email })) {
      return { errors: [{ message: 'Email is not correct please verify your entered email!', property: 'email' }] };
    }

    let user;
    try {
      const hashedPassword = await argon2.hash(data.password);
      const result = await (em as EntityManager)
        .createQueryBuilder(User)
        .getKnexQuery()
        .insert({
          id: uuidv4(),
          email: data.email,
          username: data.username,
          password: hashedPassword,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*');

      user = result[0];

      // Log the user in
      req.session.userId = user.id;
      return { user };
    } catch (error) {
      const constraint = (error.constraint as string).split('_')[1];

      if (error.code === '23505') {
        return {
          errors: [{ message: `${constraint} is taken!`, property: constraint }],
        };
      }
    }

    return { user };
  }

  /**
   * Logs the User in based on the username and password provided
   * @param data, object containing username and password of the user
   * @returns User, if verified then returns the user or else an error array
   */
  @Mutation(() => UserResponse)
  async login(
    @Arg('usernameOrEmail') usernameOrEmail: string,
    @Arg('password') password: string,
    @Ctx() { em, req }: MyContext,
  ): Promise<UserResponse> {
    const user = await em.findOne(
      User,
      validEmail({ str: usernameOrEmail }) ? { email: usernameOrEmail } : { username: usernameOrEmail },
    );
    if (!user) {
      return {
        errors: [{ message: 'Invalid credentials' }],
      };
    }

    const isValid = await argon2.verify(user.password, password);
    if (!isValid) {
      return {
        errors: [{ message: 'Invalid credentials' }],
      };
    }

    // Log the user in
    req.session.userId = user.id;
    return { user };
  }

  /**
   * Logs the User out
   * @returns Boolean, indicating if the user was logged out
   */
  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext): Promise<Boolean> {
    return new Promise((resolve) =>
      req.session.destroy((err) => {
        res.clearCookie(COOKIE_NAME);
        if (err) {
          resolve(false);
          return;
        }

        resolve(true);
      }),
    );
  }

  /**
   * Generate a reset token if the user has forgot password
   * @returns Boolean, if the token was successfully generated or not
   */
  // @Mutation(() => Boolean)
  // async forgotPassword(@Arg('email') email: string, @Ctx() { req, em }: MyContext): Promise<Boolean> {
  //   //  const user = await em.findOne(User, { email })
  //   return true;
  // }
}
