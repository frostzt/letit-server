interface ValidateLengthProps {
  str: string;
  min: number;
  max?: number;
}

export const validLength = ({ str, min, max }: ValidateLengthProps): boolean => {
  if (str.length < min) {
    return false;
  }

  if (max && str.length > max) {
    return false;
  }

  return true;
};
