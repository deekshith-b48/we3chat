declare module 'web3.storage' {
  export interface Web3File extends File {
    readonly name: string;
    readonly size: number;
    readonly type: string;
    stream(): ReadableStream<Uint8Array>;
    arrayBuffer(): Promise<ArrayBuffer>;
    text(): Promise<string>;
  }

  export interface PutOptions {
    name?: string;
    maxRetries?: number;
    wrapWithDirectory?: boolean;
    onRootCidReady?: (cid: string) => void;
    onStoredChunk?: (size: number) => void;
  }

  export interface Web3Response {
    ok: boolean;
    cid: string;
    files(): Promise<Web3File[]>;
  }

  export class Web3Storage {
    constructor(options: { token: string; endpoint?: URL });
    put(files: File[], options?: PutOptions): Promise<string>;
    get(cid: string): Promise<Web3Response | null>;
    status(cid: string): Promise<any>;
  }
}
