#!/usr/bin/env node

// Test Microsoft SSO Configuration
console.log('🔐 Testing Microsoft SSO Configuration');
console.log('=====================================');

const requiredEnvVars = [
  'AZURE_AD_CLIENT_ID',
  'AZURE_AD_CLIENT_SECRET', 
  'AZURE_AD_TENANT_ID'
];

console.log('\n📋 Environment Variables Check:');
console.log('------------------------------');

let allPresent = true;
const missing = [];

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: Set (${value.length} chars)`);
  } else {
    console.log(`❌ ${varName}: Missing`);
    missing.push(varName);
    allPresent = false;
  }
});

console.log('\n🎯 Provider Configuration:');
console.log('-------------------------');

if (allPresent) {
  console.log('✅ All required variables present');
  
  // Test Azure AD endpoint
  const tenantId = process.env.AZURE_AD_TENANT_ID;
  const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
  
  console.log(`✅ Issuer URL: ${issuer}`);
  
  if (tenantId === 'common') {
    console.log('ℹ️  Multi-tenant configuration (any Microsoft account)');
  } else {
    console.log(`ℹ️  Single-tenant configuration (Tenant ID: ${tenantId})`);
  }
  
  console.log('\n🚀 Next Steps:');
  console.log('1. Restart your Next.js server: npm run dev');
  console.log('2. Visit: http://localhost:3000/api/auth/providers');
  console.log('3. Check for "azure-ad" provider');
  console.log('4. Test sign-in at: http://localhost:3000/auth/signin');
  
} else {
  console.log('\n❌ Configuration incomplete');
  console.log('\n🔧 To fix Microsoft auth:');
  console.log('1. Run the setup script: ./scripts/setup-microsoft-auth.sh');
  console.log('2. Or manually create Azure AD app registration');
  console.log('3. Add environment variables to .env.local');
  console.log('\n📚 Set these variables:');
  missing.forEach(varName => {
    console.log(`   ${varName}="your-value-here"`);
  });
}

console.log('\n🎯 Testing NextAuth Providers API:');
console.log('----------------------------------');

// Check if port 3000 is running
const http = require('http');
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/providers',
  method: 'GET',
  timeout: 3000
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const providers = JSON.parse(data);
      console.log('\n📋 Available providers:');
      Object.keys(providers).forEach(provider => {
        console.log(`✅ ${provider}: ${providers[provider].name}`);
      });
      
      if (providers['azure-ad']) {
        console.log('\n🎉 Microsoft SSO is configured and working!');
      } else if (missing.length === 0) {
        console.log('\n⚠️  Microsoft variables are set but provider not detected');
        console.log('   Try restarting the Next.js server');
      }
    } catch (e) {
      console.log('❌ Could not parse providers response');
    }
  });
});

req.on('error', (e) => {
  console.log('❌ Next.js server not running on port 3000');
  console.log('   Start it with: npm run dev');
});

req.end();
