import argon2 from 'argon2';
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from 'type-graphql';
import { getConnection } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from '../constants';
import { User } from '../entities/User.entity';
import { ErrorCodes } from '../graphql/errors/errorCodes';
import { PropertyError } from '../graphql/errors/FieldError.error';
import { UpdateUserInput } from '../graphql/inputs/user/UpdateUser.input';
import { UsernamePasswordInput } from '../graphql/inputs/user/UsernamePasswordInput.input';
import { requireAuthentication } from '../middlewares/requireAuthentication';
import { MyContext } from '../types/GqlContext.type';
import { sendEmail } from '../utils/sendMail';
import { validEmail, validLength, validPassword } from '../utils/vaildators/propertyValidation.validator';

@ObjectType()
class UserResponse {
  @Field(() => User, { nullable: true })
  user?: User;

  @Field(() => [PropertyError], { nullable: true })
  errors?: PropertyError[];
}

@ObjectType()
class BooleanResponse {
  @Field(() => Boolean, { nullable: true })
  changePassword?: boolean;

  @Field(() => [PropertyError], { nullable: true })
  errors?: PropertyError[];
}

@Resolver(User)
export class UserResolver {
  /**
   * Don't show users each others email
   */
  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { req }: MyContext) {
    if (req.session.userId === user.id) {
      return user.email;
    }

    return '';
  }

  /**
   * Fetches the currently logged in user based on the sesssion
   * @returns User, returns the User object or null
   */
  @Query(() => User, { nullable: true })
  async me(@Ctx() { req }: MyContext): Promise<User | undefined> {
    if (!req.session.userId) {
      return undefined;
    }

    const user = await User.findOne({ where: { id: req.session.userId } });
    return user;
  }

  @Query(() => UserResponse, { nullable: true })
  async getUser(@Arg('username') username: string): Promise<UserResponse> {
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return {
        errors: [{ message: `The user ${username} was not found!`, errorCode: ErrorCodes.NOT_FOUND }],
      };
    }

    return { user };
  }

  /**
   * Updates and returns the updated user
   * @returns User, returns the newly updated User object
   */
  @Mutation(() => UserResponse)
  @UseMiddleware(requireAuthentication)
  async updateUser(@Arg('data') data: UpdateUserInput, @Ctx() { req }: MyContext): Promise<UserResponse> {
    const user = await User.findOne({ where: { id: req.session.userId } });
    if (!user) {
      return {
        errors: [{ message: 'This user does not exist!' }],
      };
    }

    const { email: updatedEmail } = data;
    if (updatedEmail) {
      user.email = updatedEmail;
    }

    await user.save();

    return { user };
  }

  /**
   * Creates a new User based on the username and password provided
   * @param data, object containing username and password of the user
   * @returns User, returns the newly created User object
   */
  @Mutation(() => UserResponse)
  async register(@Arg('data') data: UsernamePasswordInput, @Ctx() { req }: MyContext): Promise<UserResponse> {
    let user;
    try {
      // Validations
      if (!validLength({ str: data.username, min: 3 })) {
        return { errors: [{ message: 'Username must be longer than 3 characters', property: 'username' }] };
      }

      if (!validPassword({ password: data.password })) {
        return {
          errors: [
            {
              message: 'Password must be between 8 and 32, with uppercase, lowercase, and special characters!',
              property: 'password',
            },
          ],
        };
      }

      if (!validEmail({ email: data.email })) {
        return { errors: [{ message: 'Email is not correct please verify your entered email!', property: 'email' }] };
      }

      const hashedPassword = await argon2.hash(data.password);

      // Using queryBuilder since User.create() does not return all the fields
      const result = await getConnection()
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({
          username: data.username,
          email: data.email,
          password: hashedPassword,
        })
        .returning('*')
        .execute();
      user = result.raw[0];

      // Log the user in
      req.session.userId = user.id;
      return { user };
    } catch (error) {
      console.log(error);
      if (error.code === '23505') {
        return {
          errors: [{ message: 'Username or email already taken!', property: 'username' }],
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
    @Ctx() { req }: MyContext,
  ): Promise<UserResponse> {
    const user = await User.findOne({
      where: validEmail({ email: usernameOrEmail }) ? { email: usernameOrEmail } : { username: usernameOrEmail },
    });
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
  @Mutation(() => Boolean)
  async forgotPassword(@Arg('email') email: string, @Ctx() { redis }: MyContext): Promise<Boolean> {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return true;
    }

    const token = uuidv4();
    await redis.set(FORGET_PASSWORD_PREFIX + token, user.id, 'ex', 1000 * 60 * 10);

    await sendEmail(
      email,
      `<a href="http://localhost:3000/change-password/${token}">Reset your password!</a>`,
      'Reset your Letit password',
    );

    return true;
  }

  /**
   * Change the users password based on the token provided
   * @returns Boolean, if the token was successfully generated or not
   */
  @Mutation(() => BooleanResponse)
  async changePassword(
    @Arg('token') token: string,
    @Arg('newPassword') newPassword: string,
    @Ctx() { redis }: MyContext,
  ): Promise<BooleanResponse> {
    if (!validPassword({ password: newPassword })) {
      return {
        errors: [
          {
            message: 'Password must be between 8 and 32, with uppercase, lowercase, and special characters!',
            property: 'password',
          },
        ],
      };
    }

    const key = FORGET_PASSWORD_PREFIX + token;
    const userId = await redis.get(key);
    if (!userId) {
      return { errors: [{ message: 'This session is not valid!', property: 'token' }] };
    }

    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      return { errors: [{ message: 'This user no longer exists!', property: 'token' }] };
    }

    await User.update({ id: userId }, { password: await argon2.hash(newPassword) });
    await redis.del(key);

    return { changePassword: true };
  }
}
