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

# Set environment variables with ARG
ARG VITE_OPENAI_API_KEY
ARG VITE_TOGETHER_API_KEY

# Set them as environment variables
ENV VITE_OPENAI_API_KEY=$VITE_OPENAI_API_KEY
ENV VITE_TOGETHER_API_KEY=$VITE_TOGETHER_API_KEY

# Build the app
RUN npm run build

# Install serve to run the application
RUN npm install -g serve

# Expose the port the app runs on
EXPOSE 3000

# Serve the app
CMD ["serve", "-s", "dist", "-l", "3000"] 