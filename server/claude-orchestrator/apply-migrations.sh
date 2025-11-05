#!/bin/bash

# Apply migrations to Supabase via psql
# Usage: ./apply-migrations.sh <database-url>

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

if [ -z "$1" ]; then
    echo -e "${RED}Error: Database URL required${NC}"
    echo "Usage: $0 <postgres-connection-string>"
    echo ""
    echo "Get your connection string from:"
    echo "Supabase Dashboard → Project Settings → Database → Connection string"
    echo ""
    echo "Example:"
    echo "$0 'postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres'"
    exit 1
fi

DB_URL="$1"

echo -e "${BLUE}Applying migrations...${NC}"
echo ""

# Apply base tables
echo -e "${BLUE}1. Creating base tables...${NC}"
psql "$DB_URL" -f ../migrations/00_base_tables_for_testing.sql
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Base tables created${NC}"
else
    echo -e "${RED}✗ Failed to create base tables${NC}"
    exit 1
fi

echo ""

# Apply Claude SDK tables
echo -e "${BLUE}2. Creating Claude SDK tables...${NC}"
psql "$DB_URL" -f ../migrations/20250105_claude_sdk_tables.sql
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Claude SDK tables created${NC}"
else
    echo -e "${RED}✗ Failed to create Claude SDK tables${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ All migrations applied successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Next step: Run the test${NC}"
echo -e "  ${GREEN}node test-interactive.js${NC}"
echo ""
