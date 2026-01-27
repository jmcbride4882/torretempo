FROM node:20-slim

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production
COPY . .

ENV NODE_ENV=production
ENV DB_PATH=/data/torre-tempo.sqlite

VOLUME ["/data"]

EXPOSE 4000

CMD ["npm", "start"]
