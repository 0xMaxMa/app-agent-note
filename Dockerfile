FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG BASE_PATH
ENV BASE_PATH=$BASE_PATH
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 4000
ENV PORT=4000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
