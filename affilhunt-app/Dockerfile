FROM node:22-alpine
WORKDIR /app
COPY affilhunt-app/package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund
COPY affilhunt-app/bootstrap.mjs ./bootstrap.mjs
ENV NODE_ENV=production
CMD ["node","bootstrap.mjs"]
