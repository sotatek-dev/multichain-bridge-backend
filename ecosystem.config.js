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
      script: 'yarn console crawl-eth-bridge-contract',
    },
    {
      name: `evm-sender-eth-bridge-unlock-${process.env.NODE_ENV}`,
      script: 'yarn console sender-eth-bridge-unlock',
    },
    {
      name: `mina-bridge-crawler-${process.env.NODE_ENV}`,
      script: 'yarn console crawl-mina-bridge-contract',
    },
    {
      name: `mina-token-crawler-${process.env.NODE_ENV}`,
      script: 'yarn console crawl-mina-token-contract',
    },
    {
      name: `mina-sender-bridge-unlock-${process.env.NODE_ENV}`,
      script: 'yarn console sender-mina-bridge-unlock',
    }
  ],
};
