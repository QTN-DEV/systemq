# Tahap pertama: Build aplikasi
FROM node:22 AS build

# Set working directory
WORKDIR /app

# Salin file package.json dan package-lock.json (atau yarn.lock) terlebih dahulu untuk memanfaatkan cache layer Docker
COPY package*.json ./

# Install dependensi aplikasi
RUN npm install --legacy-peer-deps

# Salin seluruh file aplikasi ke dalam container
COPY . .
RUN echo "VITE_API_BASE_URL=PLACEHOLDER_API_URL" > .env

# Build aplikasi untuk production
RUN npm run build

# Tahap kedua: Serve aplikasi
FROM node:22

WORKDIR /app

# Copy hasil build dari tahap sebelumnya
COPY --from=build /app/dist ./dist

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
RUN ls -lah / && head -n 1 /docker-entrypoint.sh && file /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]


# Install serve package globally
RUN npm install -g serve

# Expose port 5173 untuk mengakses aplikasi
EXPOSE 5173

# Jalankan serve untuk menyajikan aplikasi
CMD ["serve", "-s", "dist", "-l", "5173"]