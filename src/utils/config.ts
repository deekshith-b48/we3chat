/**
 * Runtime Configuration Loader for IPFS Deployment
 * 
 * This allows the same IPFS CID to work with different environments
 * by loading configuration at runtime instead of build time.
 */

export interface AppConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  ceramic: {
    network: string;
    nodeUrl: string;
  };
  blockchain: {
    chainId: number;
    rpcUrl: string;
    chatAddress: string;
    walletConnectProjectId: string;
  };
  ipfs: {
    web3StorageToken: string;
  };
  app: {
    name: string;
    version: string;
    environment: string;
  };
}

let config: AppConfig | null = null;

/**
 * Load configuration from public/config.json
 * This is called at app startup and can be overridden for different deployments
 */
export async function loadConfig(): Promise<AppConfig> {
  if (config) {
    return config;
  }

  try {
    const response = await fetch('/config.json');
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status}`);
    }
    
    config = await response.json();
    
    // Validate required fields
    if (!config?.supabase?.url || !config?.supabase?.anonKey) {
      throw new Error('Invalid config: missing Supabase configuration');
    }
    
    if (!config?.ceramic?.nodeUrl) {
      throw new Error('Invalid config: missing Ceramic configuration');
    }

    if (!config?.blockchain?.chainId || !config?.blockchain?.rpcUrl || !config?.blockchain?.chatAddress) {
      throw new Error('Invalid config: missing blockchain configuration');
    }
    
    console.log('✅ Configuration loaded:', {
      environment: config.app.environment,
      supabaseUrl: config.supabase.url,
      ceramicNetwork: config.ceramic.network,
      blockchainChainId: config.blockchain.chainId,
      chatContract: config.blockchain.chatAddress
    });
    
    return config;
  } catch (error) {
    console.error('❌ Failed to load configuration:', error);
    
    // Fallback to default configuration for development
    config = {
      supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ujzajosepfzifmckclib.supabase.co',
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqemFqb3NlcGZ6aWZtY2tjbGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNjY3NzAsImV4cCI6MjA3MTk0Mjc3MH0.Eq4yeyCFTJd9nGVSn_3czZJ-JTwNWq4Z3Mo2qusMA34'
      },
      ceramic: {
        network: process.env.NEXT_PUBLIC_CERAMIC_NETWORK || 'testnet-clay',
        nodeUrl: process.env.NEXT_PUBLIC_CERAMIC_NODE_URL || 'https://ceramic-clay.3boxlabs.com'
      },
      blockchain: {
        chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '80002'),
        rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology',
        chatAddress: process.env.NEXT_PUBLIC_CHAT_ADDRESS || '0xd9145CCE52D386f254917e481eB44e9943F39138',
        walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '8cb5f2e46026e60e91bd567dfe2c6ce4'
      },
      ipfs: {
        web3StorageToken: process.env.NEXT_PUBLIC_WEB3_STORAGE_TOKEN || 'YOUR_WEB3_STORAGE_TOKEN_HERE'
      },
      app: {
        name: 'we3chat',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    };
    
    console.log('✅ Using fallback configuration for development');
    return config;
  }
}

/**
 * Get the current configuration
 * Throws an error if config hasn't been loaded yet
 */
export function getConfig(): AppConfig {
  if (!config) {
    throw new Error('Configuration not loaded. Call loadConfig() first.');
  }
  return config;
}

/**
 * Override configuration (useful for testing or different deployments)
 */
export function setConfig(newConfig: AppConfig): void {
  config = newConfig;
}

/**
 * Check if we're running on IPFS
 */
export function isIPFS(): boolean {
  return window.location.protocol === 'ipfs:' || 
         window.location.hostname.includes('ipfs') ||
         window.location.hostname.includes('gateway');
}

/**
 * Get the current environment
 */
export function getEnvironment(): string {
  return getConfig().app.environment;
}
