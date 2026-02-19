# 1. Build stage
FROM node:20 as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Environment variables for Vite build
ARG VITE_API_URL
ARG VITE_BACKEND_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build

# 2. Serve stage
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Fix permissions for non-root execution (UID 101)
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /var/log/nginx /etc/nginx/conf.d

USER nginx
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
