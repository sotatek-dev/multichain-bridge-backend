// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

module.exports = {
  apps: [
    {
      name: `mina-bridge-api-${process.env.NODE_ENV}`,
      script: 'yarn start',
    },
    {
      name: `mina-bridge-product-submitter-${process.env.NODE_ENV}`,
      script: 'yarn console product-submitter',
    },
    {
      name: `mina-bridge-product-crawler-provider-${process.env.NODE_ENV}`,
      script: 'yarn console provider',
    },
    {
      name: `mina-bridge-product-crawler-consumer-${process.env.NODE_ENV}`,
      script: 'yarn console consumer',
    },
  ],
};
