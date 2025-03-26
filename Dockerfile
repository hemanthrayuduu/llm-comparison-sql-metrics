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

# Add build arguments
ARG VITE_OPENAI_API_KEY
ARG VITE_TOGETHER_API_KEY

# Set environment variables for build time
ENV VITE_OPENAI_API_KEY=${VITE_OPENAI_API_KEY}
ENV VITE_TOGETHER_API_KEY=${VITE_TOGETHER_API_KEY}

# Print environment status (excluding sensitive values)
RUN echo "Building with environment variables configured: $(if [ -n "$VITE_OPENAI_API_KEY" ]; then echo "VITE_OPENAI_API_KEY is set"; else echo "VITE_OPENAI_API_KEY is NOT set"; fi)"

# Build the app with explicit environment variable passing
RUN VITE_OPENAI_API_KEY=${VITE_OPENAI_API_KEY} VITE_TOGETHER_API_KEY=${VITE_TOGETHER_API_KEY} npm run build || (echo "Build failed. Check if environment variables are properly set." && exit 1)

# Install serve to run the application
RUN npm install -g serve

# Expose the port the app runs on
EXPOSE 3000

# Set runtime environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Serve the app
CMD ["serve", "-s", "dist", "-l", "3000"] 