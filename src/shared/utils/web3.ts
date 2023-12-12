import Web3 from 'web3';

export type Web3Providers = {
  [key: string]: Web3;
};

export const web3: Web3Providers = {
  eth: new Web3(process.env.CHAIN_RPC_ETH),
  mina: new Web3(process.env.CHAIN_RPC_MINA),
};
