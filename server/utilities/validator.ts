export const timestampValidator = (value: number | undefined): Boolean => {
  if (value === undefined) {
    return true;
  }

  // givig 10 seconds of buffer
  return new Date(value).getTime() >= Date.now() - 10 * 1000;
};
