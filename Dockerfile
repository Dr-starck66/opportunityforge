FROM nginx:1.27-alpine
RUN apk add --no-cache unzip
COPY .astra-green-release.sha256 /tmp/.astra-green-release.sha256
COPY site.b64 /tmp/site.b64
RUN cd /tmp && sha256sum -c .astra-green-release.sha256
RUN rm -rf /usr/share/nginx/html/* \
 && base64 -d /tmp/site.b64 > /tmp/site.zip \
 && unzip -oq /tmp/site.zip -d /usr/share/nginx/html \
 && cp /usr/share/nginx/html/nginx.conf /etc/nginx/conf.d/default.conf \
 && rm -f /tmp/site.b64 /tmp/site.zip /tmp/.astra-green-release.sha256 \
    /usr/share/nginx/html/Dockerfile \
    /usr/share/nginx/html/railway.toml \
    /usr/share/nginx/html/nginx.conf \
    /usr/share/nginx/html/vercel.json
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1/health || exit 1
