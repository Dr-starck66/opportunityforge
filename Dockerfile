FROM node:22-alpine AS astra-gate
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY .astra-green-release.sha256 ./.astra-green-release.sha256
COPY site.b64 ./site.b64
COPY config/astra-seo-self-heal.json ./config/astra-seo-self-heal.json
COPY scripts/astra-seo-self-heal.mjs ./scripts/astra-seo-self-heal.mjs
COPY scripts/astra-seo-self-heal.test.mjs ./scripts/astra-seo-self-heal.test.mjs
RUN sha256sum -c .astra-green-release.sha256
RUN node --test scripts/astra-seo-self-heal.test.mjs
RUN node scripts/astra-seo-self-heal.mjs --apply
RUN node scripts/astra-seo-self-heal.mjs

FROM nginx:1.27-alpine
RUN apk add --no-cache unzip
COPY --from=astra-gate /app/site.b64 /tmp/site.b64
RUN rm -rf /usr/share/nginx/html/* \
 && base64 -d /tmp/site.b64 > /tmp/site.zip \
 && unzip -oq /tmp/site.zip -d /usr/share/nginx/html \
 && cp /usr/share/nginx/html/nginx.conf /etc/nginx/conf.d/default.conf \
 && rm -f /tmp/site.b64 /tmp/site.zip \
    /usr/share/nginx/html/Dockerfile \
    /usr/share/nginx/html/railway.toml \
    /usr/share/nginx/html/nginx.conf \
    /usr/share/nginx/html/vercel.json
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1/health || exit 1
