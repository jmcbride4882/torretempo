FROM node:20-slim

RUN apt-get update \
  && apt-get install -y git docker.io docker-compose \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production
COPY . .

ENV NODE_ENV=production
ENV DB_PATH=/data/torre-tempo.sqlite

VOLUME ["/data"]

EXPOSE 4000

CMD ["npm", "start"]
