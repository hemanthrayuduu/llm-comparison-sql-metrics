# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY llm-comparison-app/package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY llm-comparison-app/ .

# Set build argument for OpenAI API key
ARG VITE_OPENAI_API_KEY

# Set environment variable for build time
ENV VITE_OPENAI_API_KEY=${VITE_OPENAI_API_KEY}

# Build the app with explicit environment variable passing
RUN VITE_OPENAI_API_KEY=${VITE_OPENAI_API_KEY} npm run build || (echo "Build failed. Check if environment variables are properly set." && exit 1)

# Install serve to run the application
RUN npm install -g serve

# Expose the port the app runs on
EXPOSE 3000

# Set runtime environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start the application
CMD ["serve", "-s", "dist", "-l", "3000"] 