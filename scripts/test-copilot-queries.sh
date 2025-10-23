#!/bin/bash

# Copilot Test Script
# Tests 7 critical queries and reports results

DATASET_ID="cmgrhya8z0001ynm3zr7n69xl"
API_URL="http://localhost:3000/api/chat?datasetId=${DATASET_ID}"

echo "🧪 Testing Copilot - 7 Critical Queries"
echo "========================================"
echo ""

# Array of test queries
queries=(
  "Give me the exact JSON body to approve a merchant."
  "Which endpoint lists action reasons? Provide method + path only."
  "List all components returned by /boarding-case/components as a markdown table."
  "What's the contact email for Global Onboarding?"
  "What authentication methods are supported?"
  "How do I get started with the API?"
  "Tell me about the components"
)

expected_confidence=(
  "high"
  "high"
  "high"
  "high"
  "medium"
  "medium"
  "medium"
)

# Run each test
for i in "${!queries[@]}"; do
  query="${queries[$i]}"
  expected="${expected_confidence[$i]}"
  
  echo "Test $((i+1))/7: ${query}"
  echo "Expected confidence: ${expected^^}"
  
  # Make API call (requires authentication - run this from browser console or with session token)
  response=$(curl -sS -X POST "${API_URL}" \
    -H "Content-Type: application/json" \
    -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
    -d "{\"message\":\"${query}\"}")
  
  # Extract confidence level
  confidence=$(echo "$response" | jq -r '.confidenceLevel // .metadata.confidenceLevel // "unknown"')
  
  # Check if it matches
  if [ "${confidence,,}" == "${expected}" ]; then
    echo "✅ PASS - Confidence: ${confidence^^}"
  else
    echo "❌ FAIL - Expected: ${expected^^}, Got: ${confidence^^}"
  fi
  
  echo "---"
  echo ""
done

echo "🎯 Test Complete!"

