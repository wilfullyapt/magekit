#!/bin/bash

# Define the paths to the backend and frontend directories
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"

# Function to clean log files
clean_logs() {
    echo "🧹 Cleaning log files..."
    find . -name "*.log" -type f -delete
    echo "✨ Log files cleaned!"
    exit 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -c|--clean)
            clean_logs
            shift
            exit 0
            ;;
        *)
            echo "❌ Unknown option: $1"
            echo "Usage: $0 [-c|--clean]"
            exit 0
            ;;
    esac
done

# Function to start the FastAPI backend in a new terminal window
start_backend() {
    gnome-terminal --title="Backend Terminal" -- bash -c "
    cd $BACKEND_DIR;
    source venv/bin/activate;
    uvicorn app.main:app --reload;
    "
}

# Function to start the frontend development server in a new terminal window
start_frontend() {
    gnome-terminal --title="Frontend Terminal" -- bash -c "
    cd $FRONTEND_DIR;
    npm run dev;
    "
}

# Start the FastAPI backend in a new terminal window
start_backend

# Start the frontend development server in a new terminal window
start_frontend

# Wait for the terminals to open
sleep 2

# Get the window IDs of the gnome-terminal windows
BACKEND_WINDOW_ID=$(wmctrl -l | grep "Backend Terminal" | awk '{print $1}')
FRONTEND_WINDOW_ID=$(wmctrl -l | grep "Frontend Terminal" | awk '{print $1}')

# Snap the backend window to the left side of the screen
wmctrl -i -r $BACKEND_WINDOW_ID -e 0,0,0,960,1080

# Snap the frontend window to the right side of the screen
wmctrl -i -r $FRONTEND_WINDOW_ID -e 0,960,0,960,1080
