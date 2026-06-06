FROM node:20-alpine

WORKDIR /app

# Install dependencies first (cache layer)
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build step (creates dist/ for production runtime)
RUN npm run build

EXPOSE 5000

CMD ["npm", "run", "dev"]
