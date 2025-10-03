FROM node:24-alpine AS builder

RUN apk add --no-cache gcompat
WORKDIR /app

COPY package*.json tsconfig.json src ./
RUN npm ci && \
    npm run build && \
    npm prune --production

FROM gcr.io/distroless/nodejs22-debian12:nonroot

WORKDIR /app

COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/dist /app/dist

EXPOSE 3434

CMD ["dist/index.js"]
