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
  str: string;
}

export const validEmail = ({ str }: IValidateEmail): boolean => {
  const regex =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  if (regex.test(str)) {
    return true;
  }

  return false;
};
