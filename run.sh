#!/bin/bash

# Set default environment variables
export OPENAI_API_KEY=${OPENAI_API_KEY:-""}
export USE_MOCK_RESPONSES=${USE_MOCK_RESPONSES:-"true"}
export USE_MOCK_FOR_GPT4O_MINI=${USE_MOCK_FOR_GPT4O_MINI:-"true"}

# Function to display help message
show_help() {
    echo "Usage: ./run.sh [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help                 Show this help message"
    echo "  -p, --production           Run in production mode"
    echo "  -d, --development          Run in development mode (default)"
    echo "  -k, --api-key KEY          Set OpenAI API key"
    echo "  -m, --use-mock             Use mock responses (default: true)"
    echo "  -g, --use-mock-gpt4o       Use mock responses for GPT-4o-mini (default: true)"
    echo ""
    echo "Examples:"
    echo "  ./run.sh -d                Run in development mode"
    echo "  ./run.sh -p                Run in production mode"
    echo "  ./run.sh -k sk-abc123      Run with OpenAI API key"
    echo "  ./run.sh -m false          Run with real API responses"
    echo ""
}

# Parse command line arguments
MODE="development"

while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -h|--help)
            show_help
            exit 0
            ;;
        -p|--production)
            MODE="production"
            shift
            ;;
        -d|--development)
            MODE="development"
            shift
            ;;
        -k|--api-key)
            export OPENAI_API_KEY="$2"
            shift
            shift
            ;;
        -m|--use-mock)
            export USE_MOCK_RESPONSES="$2"
            shift
            shift
            ;;
        -g|--use-mock-gpt4o)
            export USE_MOCK_FOR_GPT4O_MINI="$2"
            shift
            shift
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Run the application
if [ "$MODE" = "production" ]; then
    echo "Running in production mode..."
    docker-compose -f docker-compose.prod.yml up --build
else
    echo "Running in development mode..."
    docker-compose up --build
fi 