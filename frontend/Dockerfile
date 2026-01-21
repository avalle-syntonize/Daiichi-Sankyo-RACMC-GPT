FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
#RUN \
#  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
#  elif [ -f package-lock.json ]; then npm ci; \
#  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
#  else echo "Lockfile not found." && exit 1; \
#  fi

RUN npm i --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV
# Generate correct .env file for nextjs from build args
ARG GENERATE_SOURCEMAP
ARG NEXTAUTH_SECRET
ARG NEXT_PUBLIC_API_URL
ARG AZURE_AD_CLIENT_ID
ARG AZURE_AD_CLIENT_SECRET
ARG AZURE_AD_TENANT_ID
ARG NEXTAUTH_URL
ARG NEXTAUTH_URL_INTERNAL
ENV NEXT_SHARP_PATH=/app/node_modules/sharp
# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED 1
RUN { \
[[ ! -z ${GENERATE_SOURCEMAP+x} ]] && echo "GENERATE_SOURCEMAP=$GENERATE_SOURCEMAP" || true ; \
[[ ! -z ${NEXTAUTH_SECRET+x} ]] && echo "NEXTAUTH_SECRET=$NEXTAUTH_SECRET" || true ; \
[[ ! -z ${NEXT_PUBLIC_API_URL+x} ]] && echo "NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL" || true ; \
[[ ! -z ${AZURE_AD_CLIENT_ID+x} ]] && echo "AZURE_AD_CLIENT_ID=$AZURE_AD_CLIENT_ID" || true ; \
[[ ! -z ${AZURE_AD_CLIENT_SECRET+x} ]] && echo "AZURE_AD_CLIENT_SECRET=$AZURE_AD_CLIENT_SECRET" || true ; \
[[ ! -z ${AZURE_AD_TENANT_ID+x} ]] && echo "AZURE_AD_TENANT_ID=$AZURE_AD_TENANT_ID" || true ; \
[[ ! -z ${NEXTAUTH_URL+x} ]] && echo "NEXTAUTH_URL=$NEXTAUTH_URL" || true ; \
[[ ! -z ${NEXTAUTH_URL_INTERNAL+x} ]] && echo "NEXTAUTH_URL_INTERNAL=$NEXTAUTH_URL_INTERNAL" || true ; \
} >> .env.${NODE_ENV}.local



RUN yarn build

# If using npm comment out above and use below instead
# RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]