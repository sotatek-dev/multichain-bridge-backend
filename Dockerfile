FROM node:22-alpine As build
WORKDIR /app

COPY package*.json ./
RUN yarn
COPY . .
RUN yarn build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/.env ./.env
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/tsconfig.build.json ./tsconfig.build.json

# RUN apk --no-cache add curl
EXPOSE 3000

#CMD ["sh", "-c", "yarn start"]