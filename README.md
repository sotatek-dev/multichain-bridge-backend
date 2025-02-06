# Mina Bridge Backend

## Table of Contents

- [General Information](#general-information)
- [Prerequire](#prerequire)
- [Installation](#installation)
- [Diagram](#diagram)
- [Support](#support)

## General Information
This project includes: API, Crawler, Submitter and Jobs of the Mina Bridge backend system

## Prerequisites
- Node v18.15
- pm2
- docker

## Installation
### Install dependencies
```bash
yarn
```
### Prepare an .env file
You can find all env keys from the .env.example, copy them and create your own .env with your env values.

### Build project
```bash
yarn build
```

### Start project
``Note: If you don't have Postgres installed on your local machine, run:``
```bash
docker-compose up -d
```

#### Using pm2
You can use the `pm2` to run the project by running:
```bash
pm2 reload ecosystem.config.js
```
#### Start manually
You can also start the project manually by running these below commands:

`Start the api`
```bash
yarn start
```
or start in dev mode:
```bash
yarn start:dev
```
`Start the crawl evm`
```bash
yarn console crawl-eth-bridge-contract
```
`Start the job unlock evm`
```bash
yarn console sender-eth-bridge-unlock
```
`Start the crawler Sc bridge mina`
```bash
yarn console crawl-mina-bridge-contract
```
`Start the crawl Token Mina`
```bash
yarn console crawl-mina-token-contract
```
`Start the unlock mina job`
```bash
yarn console sender-mina-bridge-unlock

`Start the get token price job`
```bash
yarn console get-price-token
```

### DB Migration commands:

```bash
yarn migration:create {migrationName}
```

```bash
yarn migration:run
```

```bash
yarn migration:revert
```

``Note: Before running migration, please run:``
```bash
yarn build
```

To seed data, run:
```bash
yarn seed:run
```
or
```bash
yarn seed:run --name {SeederName}
```

## Support
If you have any issue with this repository, please feel free to contact our team 

<!-- (10/3/2024) -->
