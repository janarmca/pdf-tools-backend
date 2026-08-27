# Google Cloud Run deployment for pdf-tools-backend.
# Unlike Render (which has ffmpeg pre-available), Cloud Run builds a container
# from scratch — so we install ffmpeg explicitly here.

FROM node:20-slim

# ffmpeg for video compression, ca-certificates for HTTPS calls to Supabase/Razorpay/Gemini
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .

# Cloud Run injects PORT automatically (usually 8080) — server.js already
# reads process.env.PORT, so nothing else to configure here.
ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "server.js"]
