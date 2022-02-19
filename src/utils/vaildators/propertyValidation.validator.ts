interface IValidateLength {
  str: string;
  min: number;
  max?: number;
}

export const validLength = ({ str, min, max }: IValidateLength): boolean => {
  if (str.length < min) {
    return false;
  }

  if (max && str.length > max) {
    return false;
  }

  return true;
};

interface IValidateEmail {
  email: string;
}

export const validEmail = ({ email }: IValidateEmail): boolean => {
  const regex =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  if (regex.test(email)) {
    return true;
  }

  return false;
};

interface IValidatePassword {
  password: string;
}

export const validPassword = ({ password }: IValidatePassword): boolean => {
  const regex = /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;

  if (regex.test(password)) {
    return true;
  }

  return false;
};
