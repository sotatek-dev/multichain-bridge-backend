// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

module.exports = {
  apps: [
    {
      name: `mina-bridge-api-${process.env.NODE_ENV}`,
      script: 'yarn start',
    },
    {
      name: `evm-bridge-crawler-${process.env.NODE_ENV}`,
      script: 'yarn console:dev crawl-eth-bridge-contract',
    },
    {
      name: `evm-sender-eth-bridge-unlock-${process.env.NODE_ENV}`,
      script: 'yarn console:dev sender-eth-bridge-unlock',
    },
    {
      name: `mina-bridge-crawler-${process.env.NODE_ENV}`,
      script: 'yarn console:dev crawl-mina-bridge-contract',
    },
    {
      name: `mina-sender-bridge-unlock-${process.env.NODE_ENV}`,
      script: 'yarn console:dev sender-mina-bridge-unlock',
    },
    {
      name: `get-price-token-${process.env.NODE_ENV}`,
      script: 'yarn console:dev get-price-token',
    },
  ],
};
