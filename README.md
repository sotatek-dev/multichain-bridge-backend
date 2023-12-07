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
- Node v16.15
- pm2
- docker
- redis

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
``Note: If you don't have Postgres or redis installed on your local machine, run:``
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
`Start the submitter`
```bash
yarn console product-submitter
```
`Start the crawler provider`
```bash
yarn console provider
```
`Start the crawler consumer`
```bash
yarn console consumer
```
`Start the submitter`
```bash
yarn console product-submitter
```
`Start the clean unused media job`
```bash
yarn console clean-unused-media
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
