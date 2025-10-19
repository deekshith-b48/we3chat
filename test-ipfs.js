/**
 * Simple IPFS Integration Test
 * 
 * This script tests the IPFS functionality without requiring a full React environment
 */

const { getIPFSService } = require('./src/lib/ipfs-service.ts');

async function testIPFS() {
  console.log('🧪 Testing IPFS Integration...\n');

  try {
    // Initialize IPFS service
    const ipfsService = getIPFSService();
    
    // Check available providers
    const providers = ipfsService.getAvailableProviders();
    const status = ipfsService.getProviderStatus();
    
    console.log('📋 Available Providers:', providers);
    console.log('📊 Provider Status:', status);
    
    if (providers.length === 0) {
      console.log('⚠️  No IPFS providers available. Please configure Pinata API keys.');
      console.log('   Add to .env.local:');
      console.log('   NEXT_PUBLIC_PINATA_API_KEY=your_api_key');
      console.log('   NEXT_PUBLIC_PINATA_SECRET_KEY=your_secret_key');
      return;
    }

    // Test upload
    const testContent = 'Hello from We3Chat IPFS test!';
    console.log('\n📤 Testing upload...');
    
    const uploadResult = await ipfsService.upload(testContent, 'test-message.txt');
    console.log('✅ Upload successful:', {
      cid: uploadResult.cid,
      provider: uploadResult.provider,
      size: uploadResult.size,
      url: uploadResult.url
    });

    // Test download
    console.log('\n📥 Testing download...');
    const downloadedContent = await ipfsService.download(uploadResult.cid);
    console.log('✅ Download successful:', downloadedContent);

    // Verify content matches
    if (downloadedContent === testContent) {
      console.log('\n🎉 IPFS integration test PASSED!');
    } else {
      console.log('\n❌ IPFS integration test FAILED - content mismatch');
    }

  } catch (error) {
    console.error('\n❌ IPFS integration test FAILED:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check your internet connection');
    console.log('   2. Verify Pinata API keys are correct');
    console.log('   3. Check if IPFS gateway is accessible');
  }
}

// Run the test
testIPFS();
