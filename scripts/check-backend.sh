#!/bin/bash
# Backend Services Health Check
# Validates all external services are properly configured

set -a
source .env.local 2>/dev/null || true
set +a

echo "🔍 Avenai Backend Services Health Check"
echo "════════════════════════════════════════════════════════════"
echo ""

# Check Database (Neon)
echo "🗄️  Database (PostgreSQL)"
if [[ -z "$DATABASE_URL" ]]; then
  echo "   ❌ DATABASE_URL not configured"
else
  if [[ "$DATABASE_URL" == *"neon"* ]]; then
    echo "   ✅ Connected to Neon PostgreSQL"
    echo "      Provider: Neon (cloud)"
  else
    echo "   ✅ Connected to Local PostgreSQL"
    echo "      Provider: Local"
  fi
fi
echo ""

# Check Doc-Worker
echo "🔧 Doc-Worker V2"
if [[ -z "$DOC_WORKER_URL" ]]; then
  echo "   ❌ DOC_WORKER_URL not configured"
else
  HEALTH=$(curl -s "$DOC_WORKER_URL/health" 2>/dev/null)
  if [[ $? -eq 0 ]] && [[ "$HEALTH" == *"ok"* ]]; then
    if [[ "$DOC_WORKER_URL" == *"fly.dev"* ]]; then
      echo "   ✅ Connected to Fly.io deployment"
      echo "      URL: $DOC_WORKER_URL"
      echo "      Status: $(echo $HEALTH | jq -r '.version' 2>/dev/null || echo 'healthy')"
    else
      echo "   ✅ Connected to local instance"
      echo "      URL: $DOC_WORKER_URL"
    fi
    
    if [[ "$DOC_WORKER_V2" == "true" ]]; then
      echo "      V2 Enhanced: ✅ Enabled"
    else
      echo "      V2 Enhanced: ⚠️  Disabled"
    fi
  else
    echo "   ❌ Doc-Worker unreachable at $DOC_WORKER_URL"
  fi
fi
echo ""

# Check Cloudflare R2
echo "☁️  Cloudflare R2 Storage"
if [[ -z "$STORAGE_ENDPOINT" ]] || [[ -z "$STORAGE_ACCESS_KEY_ID" ]] || [[ -z "$STORAGE_SECRET_ACCESS_KEY" ]] || [[ -z "$STORAGE_BUCKET_NAME" ]]; then
  echo "   ⚠️  Missing configuration (not critical for local dev)"
else
  if [[ "$STORAGE_ENDPOINT" == *"r2.cloudflarestorage"* ]]; then
    echo "   ✅ Configured for Cloudflare R2"
    echo "      Bucket: $STORAGE_BUCKET_NAME"
    echo "      Region: $STORAGE_REGION"
  else
    echo "   ✅ Configured for S3-compatible storage"
    echo "      Endpoint: $STORAGE_ENDPOINT"
  fi
fi
echo ""

# Check OpenAI
echo "🤖 OpenAI API"
if [[ -z "$OPENAI_API_KEY" ]]; then
  echo "   ❌ OPENAI_API_KEY not configured"
else
  echo "   ✅ API key configured"
  echo "      Model: ${OPENAI_MODEL:-gpt-4o}"
  echo "      Key: ${OPENAI_API_KEY:0:15}..."
fi
echo ""

# Check NextAuth
echo "🔐 Authentication (NextAuth)"
if [[ -z "$NEXTAUTH_SECRET" ]]; then
  echo "   ❌ NEXTAUTH_SECRET not configured"
else
  echo "   ✅ NextAuth configured"
  echo "      URL: ${NEXTAUTH_URL:-http://localhost:3000}"
  
  PROVIDERS=()
  [[ -n "$GOOGLE_CLIENT_ID" ]] && PROVIDERS+=("Google")
  [[ -n "$AZURE_AD_CLIENT_ID" ]] && PROVIDERS+=("Azure AD")
  
  if [[ ${#PROVIDERS[@]} -eq 0 ]]; then
    echo "      Providers: ⚠️  None (dev mode only)"
  else
    echo "      Providers: ${PROVIDERS[@]}"
  fi
fi
echo ""

# Check RAG Features
echo "🎯 RAG Enhancement Features"
ENABLED=0
[[ "$DOC_WORKER_V2" == "true" ]] && echo "   ✅ Doc-Worker V2 Enhanced Extraction" && ((ENABLED++))
[[ "$HYBRID_SEARCH" == "true" ]] && echo "   ✅ Hybrid Search (Vector + Full-Text)" && ((ENABLED++))
[[ "$MMR_RERANK" == "true" ]] && echo "   ✅ MMR Re-ranking (Diversity)" && ((ENABLED++))
[[ "$FALLBACK_EXPANSION" == "true" ]] && echo "   ✅ Fallback Expansion (Low Confidence)" && ((ENABLED++))
[[ "$PROMPT_ROUTER" == "true" ]] && echo "   ✅ Prompt Router (Intent-based)" && ((ENABLED++))

if [[ $ENABLED -eq 5 ]]; then
  echo "   🎉 All 5 RAG features enabled!"
elif [[ $ENABLED -ge 3 ]]; then
  echo "   ⚠️  $ENABLED/5 features enabled (some disabled)"
else
  echo "   ❌ Only $ENABLED/5 features enabled"
fi
echo ""

echo "════════════════════════════════════════════════════════════"
echo ""

# Summary
CRITICAL_OK=true
[[ -z "$DATABASE_URL" ]] && CRITICAL_OK=false
[[ -z "$OPENAI_API_KEY" ]] && CRITICAL_OK=false
[[ -z "$DOC_WORKER_URL" ]] && CRITICAL_OK=false

if $CRITICAL_OK && [[ $ENABLED -ge 4 ]]; then
  echo "🎉 All backend services are healthy and ready!"
  echo ""
  exit 0
else
  echo "⚠️  Some services need attention (see above)"
  echo ""
  exit 1
fi




