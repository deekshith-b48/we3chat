// Web3 Integration Test Script
import { web3Api } from './web3Api';
import { messageEncryption } from './messageEncryption';
import { ipfsService } from './ipfs';

export interface TestResult {
  test: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  duration?: number;
}

export class Web3Tester {
  private results: TestResult[] = [];

  async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Starting Web3 integration tests...');
    
    // Test IPFS service
    await this.testIPFSService();
    
    // Test encryption service
    await this.testEncryptionService();
    
    // Test Web3 API (if contract is deployed)
    await this.testWeb3API();
    
    // Test wallet connection
    await this.testWalletConnection();
    
    console.log('✅ Web3 integration tests completed');
    return this.results;
  }

  private async testIPFSService(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Test IPFS availability
      if (!ipfsService.isAvailable()) {
        this.addResult('IPFS Service', 'skip', 'IPFS service not configured');
        return;
      }

      // Test message upload
      const testMessage = 'Hello Web3 Chat!';
      const cid = await ipfsService.uploadMessage(testMessage, { test: true });
      
      if (!cid) {
        this.addResult('IPFS Upload', 'fail', 'Failed to upload message');
        return;
      }

      // Test message download
      const downloaded = await ipfsService.downloadMessage(cid);
      
      if (downloaded.content !== testMessage) {
        this.addResult('IPFS Download', 'fail', 'Downloaded content does not match');
        return;
      }

      this.addResult('IPFS Service', 'pass', 'IPFS upload and download working', Date.now() - startTime);
    } catch (error) {
      this.addResult('IPFS Service', 'fail', `IPFS test failed: ${error}`);
    }
  }

  private async testEncryptionService(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Test key generation
      const keyPair = await messageEncryption.getOrCreateKeyPair();
      
      if (!keyPair.publicKey || !keyPair.secretKey) {
        this.addResult('Encryption Keys', 'fail', 'Failed to generate key pair');
        return;
      }

      // Test message encryption
      const testMessage = 'This is a test message';
      const recipientPublicKey = keyPair.publicKey; // Using own key for testing
      
      const encrypted = await messageEncryption.encryptMessage(testMessage, recipientPublicKey);
      
      if (!encrypted.encrypted || !encrypted.nonce) {
        this.addResult('Message Encryption', 'fail', 'Failed to encrypt message');
        return;
      }

      // Test message decryption
      const decrypted = await messageEncryption.decryptMessage(encrypted, recipientPublicKey);
      
      if (decrypted !== testMessage) {
        this.addResult('Message Decryption', 'fail', 'Decrypted message does not match original');
        return;
      }

      this.addResult('Encryption Service', 'pass', 'Encryption and decryption working', Date.now() - startTime);
    } catch (error) {
      this.addResult('Encryption Service', 'fail', `Encryption test failed: ${error}`);
    }
  }

  private async testWeb3API(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Check if contract address is configured
      const contractAddress = process.env.NEXT_PUBLIC_CHAT_CONTRACT_ADDRESS;
      
      if (!contractAddress || contractAddress === '0xYourDeployedContractAddress') {
        this.addResult('Web3 API', 'skip', 'Contract address not configured');
        return;
      }

      // Test contract connection
      // Note: This would require a deployed contract and connected wallet
      this.addResult('Web3 API', 'skip', 'Contract connection test requires deployed contract and wallet');
    } catch (error) {
      this.addResult('Web3 API', 'fail', `Web3 API test failed: ${error}`);
    }
  }

  private async testWalletConnection(): Promise<void> {
    try {
      // Check if wallet is available
      if (typeof window === 'undefined') {
        this.addResult('Wallet Connection', 'skip', 'Running on server side');
        return;
      }

      if (typeof window.ethereum === 'undefined') {
        this.addResult('Wallet Connection', 'skip', 'No Web3 wallet detected');
        return;
      }

      this.addResult('Wallet Connection', 'pass', 'Web3 wallet detected');
    } catch (error) {
      this.addResult('Wallet Connection', 'fail', `Wallet test failed: ${error}`);
    }
  }

  private addResult(test: string, status: 'pass' | 'fail' | 'skip', message: string, duration?: number): void {
    this.results.push({
      test,
      status,
      message,
      duration
    });
  }

  getResults(): TestResult[] {
    return this.results;
  }

  getSummary(): { total: number; passed: number; failed: number; skipped: number } {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;

    return { total, passed, failed, skipped };
  }
}

// Export test runner
export const runWeb3Tests = async (): Promise<TestResult[]> => {
  const tester = new Web3Tester();
  return await tester.runAllTests();
};

// Export for use in components
export const web3Tester = new Web3Tester();

