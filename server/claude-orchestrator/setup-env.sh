#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Claude Orchestrator Environment Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if .env already exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file already exists!${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}✓ Keeping existing .env file${NC}"
        exit 0
    fi
fi

echo -e "${YELLOW}📋 You need 3 credentials:${NC}"
echo ""

# 1. Anthropic API Key
echo -e "${BLUE}1. Anthropic API Key${NC}"
echo -e "   Get it from: ${GREEN}https://console.anthropic.com/${NC}"
echo -e "   (Should start with 'sk-ant-api03-')"
echo ""
read -p "Enter your Anthropic API Key: " ANTHROPIC_KEY
echo ""

# 2. Supabase URL
echo -e "${BLUE}2. Supabase Project URL${NC}"
echo -e "   Go to: Your Supabase Project > Settings > API"
echo -e "   Look for: ${GREEN}Project URL${NC}"
echo -e "   (Should look like: https://xxxxx.supabase.co)"
echo ""
read -p "Enter your Supabase URL: " SUPABASE_URL
echo ""

# 3. Supabase Service Key
echo -e "${BLUE}3. Supabase Service Role Key${NC}"
echo -e "   Go to: Your Supabase Project > Settings > API"
echo -e "   Look for: ${GREEN}service_role secret${NC} (NOT anon key!)"
echo -e "   (Should start with 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')"
echo ""
read -p "Enter your Supabase Service Key: " SUPABASE_KEY
echo ""

# Validate inputs
if [ -z "$ANTHROPIC_KEY" ] || [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo -e "${RED}✗ Error: All fields are required!${NC}"
    exit 1
fi

# Create .env file
cat > .env << EOF
# Claude Orchestrator Environment Variables
ANTHROPIC_API_KEY=$ANTHROPIC_KEY
SUPABASE_URL=$SUPABASE_URL
SUPABASE_SERVICE_KEY=$SUPABASE_KEY
NODE_ENV=development
EOF

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ .env file created successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Next steps
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo ""
echo -e "1. ${BLUE}Apply Database Migration${NC}"
echo -e "   • Go to Supabase Dashboard > SQL Editor"
echo -e "   • Run the migration from:"
echo -e "     ${GREEN}server/migrations/20250105_claude_sdk_tables.sql${NC}"
echo ""
echo -e "2. ${BLUE}Run the Test${NC}"
echo -e "   ${GREEN}node test-interactive.js${NC}"
echo ""
echo -e "${YELLOW}💡 See SETUP.md for detailed instructions${NC}"
echo ""
