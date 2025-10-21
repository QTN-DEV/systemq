# Tahap pertama: Build aplikasi
FROM node:22 AS build

# Set working directory
WORKDIR /app

# Salin file package.json dan package-lock.json terlebih dahulu
COPY package*.json ./

# Install dependensi aplikasi
RUN npm install

# Salin seluruh file aplikasi ke dalam container
COPY . .

# Set environment variables untuk production
ENV VITE_API_BASE_URL=https://api.yourdomain.com
RUN echo "VITE_API_BASE_URL=${VITE_API_BASE_URL}" > .env

# Build aplikasi untuk production
RUN npm run build

# Tahap kedua: Serve aplikasi
FROM node:22

WORKDIR /app

# Set environment variables untuk runtime
ENV VITE_API_BASE_URL=https://api.yourdomain.com

# Copy hasil build dari tahap sebelumnya
COPY --from=build /app/dist ./dist

COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Install serve package globally
RUN npm install -g serve

# Expose port 5173
EXPOSE 5173

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["serve", "-s", "dist", "-l", "5173"]