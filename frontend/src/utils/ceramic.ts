// Ceramic client utilities for decentralized data storage
// TODO: Install @ceramicnetwork/http-client, @ceramicnetwork/stream-tile, @ceramicnetwork/blockchain-utils-linking

interface AppConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  ceramic: {
    nodeUrl: string;
    network: string;
  };
  environment: string;
}

let config: AppConfig | null = null;

export async function loadConfig(): Promise<AppConfig> {
  if (config) return config;
  
  try {
    const response = await fetch('/config.json');
    config = await response.json();
    return config!;
  } catch (error) {
    console.error('Failed to load config:', error);
    // Fallback to environment variables for development
    config = {
      supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      },
      ceramic: {
        nodeUrl: process.env.NEXT_PUBLIC_CERAMIC_NODE_URL || 'https://ceramic-clay.3boxlabs.com',
        network: process.env.NEXT_PUBLIC_CERAMIC_NETWORK || 'testnet-clay'
      },
      environment: process.env.NODE_ENV || 'development'
    };
    return config!;
  }
}

// Mock Ceramic client for now - replace with real implementation
class MockCeramicClient {
  private streams = new Map<string, Record<string, unknown>>();
  public did: { id: string } | null = null;

  async setDIDProvider(): Promise<void> {
    // Mock DID authentication - no provider needed in mock
    console.log('Mock DID provider set for development');
    this.did = { id: `did:3:mock_${Date.now()}` };
  }

  async createStream(content: Record<string, unknown>, metadata: Record<string, unknown>): Promise<{ id: string }> {
    const streamId = `ceramic://mock_${Date.now()}`;
    this.streams.set(streamId, { content, metadata });
    return { id: streamId };
  }

  async loadStream(streamId: string): Promise<{ content: Record<string, unknown>; update: (newContent: Record<string, unknown>) => Promise<void> }> {
    const stream = this.streams.get(streamId) || { content: { messages: [] } };
    return {
      content: stream.content as Record<string, unknown>,
      update: async (newContent: Record<string, unknown>) => {
        this.streams.set(streamId, { ...stream, content: newContent });
      }
    };
  }
}

let ceramicClient: MockCeramicClient | null = null;

export async function getCeramicClient(): Promise<MockCeramicClient> {
  if (ceramicClient) return ceramicClient;
  
  // Load config for future real implementation
  await loadConfig();
  ceramicClient = new MockCeramicClient();
  return ceramicClient;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function authenticateCeramic(address: string, provider: unknown): Promise<string> {
  const ceramic = await getCeramicClient();
  
  try {
    // Mock authentication for now - parameters intentionally unused in mock
    await ceramic.setDIDProvider();
    return ceramic.did?.id || '';
  } catch (error) {
    console.error('Failed to authenticate with Ceramic:', error);
    throw new Error('Ceramic authentication failed');
  }
}

export async function createMessageStream(chatId: string): Promise<string> {
  const ceramic = await getCeramicClient();
  
  try {
    const streamContent = {
      chatId,
      messages: [],
      createdAt: new Date().toISOString()
    };
    
    const stream = await ceramic.createStream(streamContent, {
      controllers: [ceramic.did?.id],
      family: `we3chat-messages-${chatId}`
    });
    
    return stream.id;
  } catch (error) {
    console.error('Failed to create message stream:', error);
    throw new Error('Failed to create message stream');
  }
}

export interface CeramicMessage {
  sender_did: string;
  content: string;
  timestamp: string;
  id: string;
}

export async function addMessageToStream(
  streamId: string, 
  message: Omit<CeramicMessage, 'id'>
): Promise<void> {
  const ceramic = await getCeramicClient();
  
  try {
    const stream = await ceramic.loadStream(streamId);
    const currentContent = stream.content as { messages: CeramicMessage[] };
    
    const newMessage: CeramicMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    const updatedContent = {
      ...currentContent,
      messages: [...(currentContent.messages || []), newMessage]
    };
    
    await stream.update(updatedContent);
  } catch (error) {
    console.error('Failed to add message to stream:', error);
    throw new Error('Failed to add message to stream');
  }
}

export async function getMessagesFromStream(streamId: string): Promise<CeramicMessage[]> {
  const ceramic = await getCeramicClient();
  
  try {
    const stream = await ceramic.loadStream(streamId);
    const content = stream.content as { messages: CeramicMessage[] };
    return content.messages || [];
  } catch (error) {
    console.error('Failed to get messages from stream:', error);
    return [];
  }
}
