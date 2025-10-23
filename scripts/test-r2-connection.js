// scripts/test-r2-connection.js
// Test script to verify R2 storage connection

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');

async function testR2Connection() {
  console.log('🧪 Testing R2 Storage Connection...\n');

  // Check environment variables
  const config = {
    endpoint: process.env.STORAGE_ENDPOINT,
    region: process.env.STORAGE_REGION || 'auto',
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  };

  console.log('📋 Configuration:');
  console.log(`   Endpoint: ${config.endpoint}`);
  console.log(`   Region: ${config.region}`);
  console.log(`   Bucket: ${process.env.STORAGE_BUCKET_NAME}`);
  console.log(`   Access Key: ${config.credentials.accessKeyId ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Secret Key: ${config.credentials.secretAccessKey ? '✅ Set' : '❌ Missing'}\n`);

  // Validate required config
  if (!config.endpoint || !config.credentials.accessKeyId || !config.credentials.secretAccessKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   - STORAGE_ENDPOINT');
    console.error('   - STORAGE_ACCESS_KEY_ID');
    console.error('   - STORAGE_SECRET_ACCESS_KEY');
    console.error('   - STORAGE_BUCKET_NAME');
    process.exit(1);
  }

  const client = new S3Client(config);
  const bucketName = process.env.STORAGE_BUCKET_NAME;

  try {
    // Test 1: Upload a test file
    console.log('📤 Test 1: Uploading test file...');
    const testKey = `test-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.txt`;
    const testContent = `Avenai R2 Test File
Created: ${new Date().toISOString()}
Test ID: ${testKey}`;

    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain',
      Metadata: {
        'test': 'true',
        'created-by': 'avenai-test-script',
      },
    });

    await client.send(uploadCommand);
    console.log('✅ Upload successful!');

    // Test 2: Download the test file
    console.log('📥 Test 2: Downloading test file...');
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: testKey,
    });

    const response = await client.send(getCommand);
    const downloadedContent = await response.Body.transformToString();
    
    if (downloadedContent === testContent) {
      console.log('✅ Download successful! Content matches.');
    } else {
      console.log('❌ Download failed! Content mismatch.');
    }

    // Test 3: Delete the test file
    console.log('🗑️  Test 3: Cleaning up test file...');
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: testKey,
    });

    await client.send(deleteCommand);
    console.log('✅ Cleanup successful!');

    console.log('\n🎉 All tests passed! Your R2 storage is working correctly.');
    console.log('\n📝 Next steps:');
    console.log('   1. Your environment variables are correctly set');
    console.log('   2. R2 bucket is accessible');
    console.log('   3. You can now upload documents through your copilot');
    console.log('   4. Test file upload in your application UI');

  } catch (error) {
    console.error('\n❌ R2 connection test failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.name === 'NoSuchBucket') {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Check that your bucket name is correct');
      console.error('   - Verify the bucket exists in your Cloudflare dashboard');
    } else if (error.name === 'InvalidAccessKeyId') {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Check your ACCESS_KEY_ID is correct');
      console.error('   - Verify the API token has R2 permissions');
    } else if (error.name === 'SignatureDoesNotMatch') {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Check your SECRET_ACCESS_KEY is correct');
      console.error('   - Verify the API token was created properly');
    } else if (error.code === 'ENOTFOUND') {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Check your STORAGE_ENDPOINT URL is correct');
      console.error('   - Verify your Account ID in the endpoint URL');
    }
    
    process.exit(1);
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

testR2Connection();
