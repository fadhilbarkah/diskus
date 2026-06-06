FROM oven/bun:1-alpine as builder

WORKDIR /app

# Accept build arguments for API URLs
ARG VITE_API_URL

# Build Dashboard
WORKDIR /app/dashboard
COPY dashboard/package.json dashboard/bun.lock* ./
RUN bun install
COPY dashboard/ ./
ENV VITE_API_URL=$VITE_API_URL
RUN bun run build

# Build Widget
WORKDIR /app/widget
COPY widget/package.json widget/bun.lock* ./
RUN bun install
COPY widget/ ./
ENV VITE_API_URL=$VITE_API_URL
RUN bun run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy dashboard build to root
COPY --from=builder /app/dashboard/dist /usr/share/nginx/html

# Copy widget build to /widget/dist
COPY --from=builder /app/widget/dist /usr/share/nginx/html/widget/dist

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
