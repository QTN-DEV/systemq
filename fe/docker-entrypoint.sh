#!/bin/sh

# Generate env.js di dalam dist folder
echo "window.env = {" > /app/dist/env.js
echo "  VITE_API_BASE_URL: \"${VITE_API_BASE_URL}\"" >> /app/dist/env.js
echo "};" >> /app/dist/env.js
sed -i "s|PLACEHOLDER_API_URL|${VITE_API_BASE_URL}|g" /app/dist/**/*.js

# Jalanin command berikutnya (serve -s dist -l 3000)
exec "$@"