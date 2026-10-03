FROM node:22-alpine
WORKDIR /app
COPY package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund
COPY bootstrap.mjs reliability.mjs ./
RUN npm run check
ENV NODE_ENV=production
CMD ["node","bootstrap.mjs"]
