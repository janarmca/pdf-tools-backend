# Google Cloud Run deployment for pdf-tools-backend.
# Unlike Render (which has ffmpeg pre-available), Cloud Run builds a container
# from scratch — so we install ffmpeg explicitly here.

FROM node:22-slim

# ffmpeg for video compression, ca-certificates for HTTPS calls to Supabase/Razorpay/Gemini
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only what's needed to install dependencies first (better build caching).
# Not using a package-lock.json wildcard here — some Cloud Build environments
# handle that glob pattern inconsistently, so we copy package.json alone and
# let npm resolve versions fresh (safer/more portable across build systems).
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY . .

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "server.js"]
