import { toChecksumAddress } from 'web3-utils';

export const formatEthersAddress = (rawAddress: string) => {
  try {
    return toChecksumAddress(rawAddress);
  } catch (error) {
    console.log(`Cannot convert ${rawAddress} to ethers checksum address.`);
    return rawAddress;
  }
};
export const formatMinaAddress = (rawAddress: string) => {
  try {
    return rawAddress;
  } catch (error) {
    console.log(`Cannot convert ${rawAddress} to ethers checksum address.`);
    return rawAddress;
  }
};
