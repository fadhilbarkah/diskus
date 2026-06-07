#!/bin/sh

# Diskus Start Script
# This script ensures a secure environment is generated before starting Docker

ENV_FILE=".env"

echo "🚀 Starting Diskus setup..."

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "📄 No .env file found. Generating a secure one for you..."
    
    # Generate a secure 32-byte hex string
    SECRET=$(openssl rand -hex 32 2>/dev/null)
    
    # Fallback if openssl is not installed
    if [ -z "$SECRET" ]; then
        SECRET=$(LC_ALL=C tr -dc 'a-f0-9' < /dev/urandom | head -c 64)
    fi

    # Create the .env file
    cat <<EOF > "$ENV_FILE"
# Diskus Environment Variables (Auto-generated)
JWT_SECRET=${SECRET}
DASHBOARD_ORIGIN=*
SEED_DB=true

# Optional: Set these for email notifications via Resend
# RESEND_API_KEY=
# RESEND_SENDER_EMAIL=
EOF
    echo "✅ Secure JWT_SECRET generated and saved to .env"
else
    echo "✅ Existing .env file found. Using current configuration."
fi

echo "🐳 Starting Docker containers..."
docker-compose up -d --build

echo ""
echo "✨ Diskus is now running!"
echo "Dashboard: http://localhost:8080"
echo "API Endpoint: http://localhost:3000/api/v1"
