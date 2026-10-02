FROM node:22-alpine
WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY .astra-green-release.blobsha ./.astra-green-release.blobsha
COPY Dockerfile ./Dockerfile
COPY railway.toml ./railway.toml
COPY server.mjs ./server.mjs
COPY site.b64 ./site.b64
COPY config/astra-seo-self-heal.json ./config/astra-seo-self-heal.json
COPY scripts/astra-seo-self-heal.mjs ./scripts/astra-seo-self-heal.mjs
COPY scripts/astra-seo-self-heal.test.mjs ./scripts/astra-seo-self-heal.test.mjs
COPY scripts/astra-verify-green-token.mjs ./scripts/astra-verify-green-token.mjs
COPY affilhunt-app ./affilhunt-app

RUN node scripts/astra-verify-green-token.mjs
RUN node --test scripts/astra-seo-self-heal.test.mjs
RUN node scripts/astra-seo-self-heal.mjs --apply
RUN node scripts/astra-seo-self-heal.mjs

ENV NODE_ENV=production
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "const p=process.env.PORT||80;fetch('http://127.0.0.1:'+p+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npm","start"]
