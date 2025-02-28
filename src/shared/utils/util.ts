import { EEnvironments, EEnvKey } from '../../constants/env.constant.js';

export const toLower = (value: string) => value.toLowerCase();

export const compareAddress = (address: string, addressCompare: string) => toLower(address) === toLower(addressCompare);

export function isEmail(mail: string) {
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
  return emailRegex.test(mail);
}

export const nullToZero = (value: string | number) => (value ? value.toString() : '0');
export const isDevelopmentEnvironment = () =>
  [EEnvironments.LOCAL, EEnvironments.DEV, EEnvironments.TEST].includes(process.env[EEnvKey.NODE_ENV] as EEnvironments);
