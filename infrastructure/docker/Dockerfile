#
# One Dockerfile, five images. The `deps` stage is shared by every target, so the workspace is
# installed once no matter how many of the six services are being built.
#
#   target: frontend  →  nginx serving one app's dist   (shell, people, delivery)
#   target: service   →  node running one API           (people-api, delivery-api)

# Debian slim rather than Alpine: the workspace has no native dependencies to gain from musl, and
# glibc avoids the class of surprise that only shows up in a container.
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY . .
RUN pnpm install --frozen-lockfile

FROM deps AS build
ARG APP
RUN test -n "$APP" || (echo "build arg APP is required" && exit 1)
RUN pnpm --filter "@repo/${APP}" build

# ---------------------------------------------------------------------------
# Static frontend. The image contains only the compiled app; the remote URLs it
# talks to are not in it (see the shell's entrypoint below).
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS frontend
ARG APP
COPY --from=build /repo/apps/${APP}/dist /usr/share/nginx/html
COPY infrastructure/docker/nginx/app.conf /etc/nginx/conf.d/default.conf
# Only the shell has one; the others ignore it.
COPY infrastructure/docker/config.template.json /etc/baseline/config.template.json
COPY infrastructure/docker/write-shell-config.sh /docker-entrypoint.d/40-write-shell-config.sh
RUN chmod +x /docker-entrypoint.d/40-write-shell-config.sh
EXPOSE 80

# ---------------------------------------------------------------------------
# A domain service. Runs the bundle produced by tsup, with the workspace's
# node_modules for its third-party runtime dependencies.
# ---------------------------------------------------------------------------
FROM build AS service
ARG APP
ENV NODE_ENV=production
ENV APP_DIR="apps/${APP}"
WORKDIR /repo
CMD ["sh", "-c", "node ${APP_DIR}/dist/index.js"]
