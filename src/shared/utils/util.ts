import * as cryptoJs from 'crypto-js';

import { EEnvironments, EEnvKey } from '../../constants/env.constant.js';

const { AES, enc } = cryptoJs;

export const toLower = (value: string) => value.toLowerCase();

export const compareAddress = (address: string, addressCompare: string) => toLower(address) === toLower(addressCompare);

export function isEmail(mail) {
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
  return emailRegex.test(mail);
}

export function encode(data: string) {
  const encryptedData = AES.encrypt(data, process.env.ENCODE_SECRET_KEY).toString();
  return encryptedData;
}

export function decode(encodedData: string) {
  const decryptedData = AES.decrypt(encodedData, process.env.ENCODE_SECRET_KEY).toString(enc.Utf8);
  return decryptedData;
}

export const getVariableName = <TResult>(getVar: () => TResult): string => {
  const m = /\(\)=>(.*)/.exec(getVar.toString().replace(/(\r\n|\n|\r|\s)/gm, ''));

  if (!m) {
    throw new Error("The function does not contain a statement matching 'return variableName;'");
  }

  const fullMemberName = m[1];

  const memberParts = fullMemberName.split('.');

  return memberParts[memberParts.length - 1];
};

export const nullToZero = (value: string | number) => (value ? value.toString() : '0');
export const isDevelopmentEnvironment = () =>
  [EEnvironments.LOCAL, EEnvironments.DEV].includes(process.env[EEnvKey.NODE_ENV] as EEnvironments);
