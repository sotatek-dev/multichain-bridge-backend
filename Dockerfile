FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install --force
COPY . .
RUN npm run build

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