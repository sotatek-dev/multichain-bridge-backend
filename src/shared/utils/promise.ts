/**
 * @param {number}  timeout - seconds.
 * @returns {Promise<void>} pause the excecution for number of seconds.
 */
export const sleep = (timeout: number) =>
  new Promise<void>(res => {
    setTimeout(
      () => {
        res();
      },
      Math.floor(timeout * 1000),
    );
  });
