# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files from the correct directory
COPY llm-comparison-app/package*.json ./

# Install dependencies
RUN npm install

# Copy project files from the correct directory
COPY llm-comparison-app/ .

# Build the app
RUN npm run build

# Install serve to run the application
RUN npm install -g serve

# Expose the port
EXPOSE 3000

# Start the application
CMD ["serve", "-s", "dist", "-l", "3000"] 