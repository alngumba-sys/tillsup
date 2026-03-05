#!/bin/bash

# ═══════════════════════════════════════════════════════════════════
# TILLSUP - Deploy Staff Creation Edge Function
# ═══════════════════════════════════════════════════════════════════
# This script deploys the create-staff Edge Function to Supabase
# Run this script to fix the ERR_BLOCKED_BY_ADMINISTRATOR error
# ═══════════════════════════════════════════════════════════════════

set -e  # Exit on any error

echo "═══════════════════════════════════════════════════════════════════"
echo "🚀 Tillsup - Staff Creation Edge Function Deployment"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo ""
    echo "Please install it first:"
    echo "  npm install -g supabase"
    echo ""
    exit 1
fi

echo "✅ Supabase CLI found: $(supabase --version)"
echo ""

# Check if project is linked
if [ ! -f ".git/config" ] && [ ! -f "supabase/.temp/project-ref" ]; then
    echo "⚠️  Project not linked to Supabase"
    echo ""
    read -p "Enter your Supabase project ref (from https://YOUR-REF.supabase.co): " project_ref
    
    if [ -z "$project_ref" ]; then
        echo "❌ Project ref is required"
        exit 1
    fi
    
    echo ""
    echo "🔗 Linking to project: $project_ref"
    supabase link --project-ref "$project_ref"
    echo ""
fi

echo "═══════════════════════════════════════════════════════════════════"
echo "📦 Deploying create-staff Edge Function..."
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Deploy the function
supabase functions deploy create-staff

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "✅ Deployment Complete!"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "1. ✅ Test staff creation in Tillsup"
echo "2. ✅ Check Edge Function logs in Supabase Dashboard"
echo "3. ✅ Verify no more ERR_BLOCKED_BY_ADMINISTRATOR errors"
echo ""
echo "📚 For more information:"
echo "   - Deployment Guide: EDGE_FUNCTION_DEPLOYMENT.md"
echo "   - Complete Guide: STAFF_CREATION_FIX_GUIDE.md"
echo "   - API Docs: supabase/functions/create-staff/README.md"
echo ""
echo "═══════════════════════════════════════════════════════════════════"
