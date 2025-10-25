import { Message, Chat, UserProfile } from './messageTypes';
import { ipfsService } from './ipfs';
import { web3Api } from './web3Api';

export interface SearchResult {
  type: 'message' | 'user' | 'group' | 'file';
  id: string;
  title: string;
  description: string;
  timestamp?: number;
  relevance: number;
  metadata?: any;
}

export interface MessageSearchResult extends SearchResult {
  type: 'message';
  message: Message;
  chatId: string;
  chatName: string;
  sender: string;
  content: string;
}

export interface UserSearchResult extends SearchResult {
  type: 'user';
  user: UserProfile;
  address: string;
  username: string;
  bio: string;
}

export interface GroupSearchResult extends SearchResult {
  type: 'group';
  group: Chat;
  groupId: string;
  groupName: string;
  memberCount: number;
  description: string;
}

export interface FileSearchResult extends SearchResult {
  type: 'file';
  fileName: string;
  fileSize: number;
  mimeType: string;
  cid: string;
  chatId: string;
  chatName: string;
}

export interface SearchFilters {
  dateRange?: {
    start: number;
    end: number;
  };
  messageTypes?: string[];
  chatTypes?: ('direct' | 'group')[];
  fileTypes?: string[];
  users?: string[];
  groups?: string[];
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'name';
  sortOrder?: 'asc' | 'desc';
  includeContent?: boolean;
  fuzzySearch?: boolean;
}

class SearchService {
  private searchIndex: Map<string, any> = new Map();
  private searchCache: Map<string, SearchResult[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeSearchIndex();
  }

  private async initializeSearchIndex(): Promise<void> {
    try {
      // Load existing search index from localStorage
      const savedIndex = localStorage.getItem('searchIndex');
      if (savedIndex) {
        this.searchIndex = new Map(JSON.parse(savedIndex));
      }
    } catch (error) {
      console.warn('Failed to load search index:', error);
    }
  }

  private saveSearchIndex(): void {
    try {
      const indexArray = Array.from(this.searchIndex.entries());
      localStorage.setItem('searchIndex', JSON.stringify(indexArray));
    } catch (error) {
      console.warn('Failed to save search index:', error);
    }
  }

  // Main search method
  async search(
    query: string,
    filters: SearchFilters = {},
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    const cacheKey = this.generateCacheKey(query, filters, options);
    
    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      return this.searchCache.get(cacheKey) || [];
    }

    try {
      const results: SearchResult[] = [];

      // Search messages
      const messageResults = await this.searchMessages(query, filters, options);
      results.push(...messageResults);

      // Search users
      const userResults = await this.searchUsers(query, filters, options);
      results.push(...userResults);

      // Search groups
      const groupResults = await this.searchGroups(query, filters, options);
      results.push(...groupResults);

      // Search files
      const fileResults = await this.searchFiles(query, filters, options);
      results.push(...fileResults);

      // Sort results
      const sortedResults = this.sortResults(results, options);

      // Cache results
      this.searchCache.set(cacheKey, sortedResults);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

      return sortedResults;
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  // Search messages
  async searchMessages(
    query: string,
    filters: SearchFilters = {},
    options: SearchOptions = {}
  ): Promise<MessageSearchResult[]> {
    try {
      // Search in IPFS content
      const ipfsResults = await ipfsService.searchContent(query);
      
      // Filter and transform results
      const results: MessageSearchResult[] = ipfsResults
        .filter(result => this.matchesFilters(result, filters))
        .map(result => ({
          type: 'message' as const,
          id: result.id,
          title: this.extractMessageTitle(result),
          description: this.extractMessageDescription(result),
          timestamp: result.timestamp,
          relevance: this.calculateRelevance(query, result),
          message: result,
          chatId: result.chatId,
          chatName: result.chatName || 'Unknown Chat',
          sender: result.sender,
          content: result.content
        }));

      return this.limitResults(results, options);
    } catch (error) {
      console.error('Message search failed:', error);
      return [];
    }
  }

  // Search users
  async searchUsers(
    query: string,
    filters: SearchFilters = {},
    options: SearchOptions = {}
  ): Promise<UserSearchResult[]> {
    try {
      const users = await web3Api.searchUsers(query);
      
      const results: UserSearchResult[] = users
        .filter(user => this.matchesUserFilters(user, filters))
        .map(user => ({
          type: 'user' as const,
          id: user.address,
          title: user.username,
          description: user.bio || 'No bio available',
          relevance: this.calculateUserRelevance(query, user),
          user,
          address: user.address,
          username: user.username,
          bio: user.bio || ''
        }));

      return this.limitResults(results, options);
    } catch (error) {
      console.error('User search failed:', error);
      return [];
    }
  }

  // Search groups
  async searchGroups(
    query: string,
    filters: SearchFilters = {},
    options: SearchOptions = {}
  ): Promise<GroupSearchResult[]> {
    try {
      const groups = await web3Api.searchGroups(query);
      
      const results: GroupSearchResult[] = groups
        .filter(group => this.matchesGroupFilters(group, filters))
        .map(group => ({
          type: 'group' as const,
          id: group.id.toString(),
          title: group.name,
          description: group.description || 'No description available',
          relevance: this.calculateGroupRelevance(query, group),
          group,
          groupId: group.id.toString(),
          groupName: group.name,
          memberCount: group.members.length,
          description: group.description || ''
        }));

      return this.limitResults(results, options);
    } catch (error) {
      console.error('Group search failed:', error);
      return [];
    }
  }

  // Search files
  async searchFiles(
    query: string,
    filters: SearchFilters = {},
    options: SearchOptions = {}
  ): Promise<FileSearchResult[]> {
    try {
      // Search for files in IPFS
      const fileResults = await ipfsService.searchFiles(query);
      
      const results: FileSearchResult[] = fileResults
        .filter(file => this.matchesFileFilters(file, filters))
        .map(file => ({
          type: 'file' as const,
          id: file.cid,
          title: file.fileName,
          description: `${this.formatFileSize(file.fileSize)} • ${file.mimeType}`,
          timestamp: file.timestamp,
          relevance: this.calculateFileRelevance(query, file),
          fileName: file.fileName,
          fileSize: file.fileSize,
          mimeType: file.mimeType,
          cid: file.cid,
          chatId: file.chatId,
          chatName: file.chatName || 'Unknown Chat'
        }));

      return this.limitResults(results, options);
    } catch (error) {
      console.error('File search failed:', error);
      return [];
    }
  }

  // Advanced search with multiple queries
  async advancedSearch(queries: string[], filters: SearchFilters = {}): Promise<SearchResult[]> {
    const allResults: SearchResult[] = [];

    for (const query of queries) {
      const results = await this.search(query, filters);
      allResults.push(...results);
    }

    // Remove duplicates and merge results
    const uniqueResults = this.removeDuplicates(allResults);
    return this.sortResults(uniqueResults, { sortBy: 'relevance' });
  }

  // Search suggestions
  async getSearchSuggestions(query: string, limit = 5): Promise<string[]> {
    if (!query.trim()) {
      return [];
    }

    const suggestions: string[] = [];
    
    // Get suggestions from search index
    for (const [key, value] of this.searchIndex.entries()) {
      if (key.toLowerCase().includes(query.toLowerCase())) {
        suggestions.push(key);
      }
    }

    // Get suggestions from recent searches
    const recentSearches = this.getRecentSearches();
    suggestions.push(...recentSearches.filter(search => 
      search.toLowerCase().includes(query.toLowerCase())
    ));

    return [...new Set(suggestions)].slice(0, limit);
  }

  // Recent searches
  getRecentSearches(): string[] {
    try {
      const recent = localStorage.getItem('recentSearches');
      return recent ? JSON.parse(recent) : [];
    } catch (error) {
      console.warn('Failed to load recent searches:', error);
      return [];
    }
  }

  addToRecentSearches(query: string): void {
    try {
      const recent = this.getRecentSearches();
      const filtered = recent.filter(search => search !== query);
      const updated = [query, ...filtered].slice(0, 10); // Keep last 10
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save recent search:', error);
    }
  }

  // Clear search cache
  clearCache(): void {
    this.searchCache.clear();
    this.cacheExpiry.clear();
  }

  // Helper methods
  private generateCacheKey(query: string, filters: SearchFilters, options: SearchOptions): string {
    return JSON.stringify({ query, filters, options });
  }

  private isCacheValid(cacheKey: string): boolean {
    const expiry = this.cacheExpiry.get(cacheKey);
    return expiry ? Date.now() < expiry : false;
  }

  private matchesFilters(result: any, filters: SearchFilters): boolean {
    // Date range filter
    if (filters.dateRange && result.timestamp) {
      const timestamp = result.timestamp;
      if (timestamp < filters.dateRange.start || timestamp > filters.dateRange.end) {
        return false;
      }
    }

    // Message type filter
    if (filters.messageTypes && result.type) {
      if (!filters.messageTypes.includes(result.type)) {
        return false;
      }
    }

    // User filter
    if (filters.users && result.sender) {
      if (!filters.users.includes(result.sender)) {
        return false;
      }
    }

    return true;
  }

  private matchesUserFilters(user: UserProfile, filters: SearchFilters): boolean {
    // Add user-specific filters here
    return true;
  }

  private matchesGroupFilters(group: Chat, filters: SearchFilters): boolean {
    // Add group-specific filters here
    return true;
  }

  private matchesFileFilters(file: any, filters: SearchFilters): boolean {
    // File type filter
    if (filters.fileTypes && file.mimeType) {
      const fileType = file.mimeType.split('/')[0];
      if (!filters.fileTypes.includes(fileType)) {
        return false;
      }
    }

    return true;
  }

  private calculateRelevance(query: string, result: any): number {
    const queryLower = query.toLowerCase();
    let relevance = 0;

    // Title match (highest relevance)
    if (result.title && result.title.toLowerCase().includes(queryLower)) {
      relevance += 10;
    }

    // Content match
    if (result.content && result.content.toLowerCase().includes(queryLower)) {
      relevance += 5;
    }

    // Description match
    if (result.description && result.description.toLowerCase().includes(queryLower)) {
      relevance += 3;
    }

    // Exact match bonus
    if (result.title && result.title.toLowerCase() === queryLower) {
      relevance += 20;
    }

    return relevance;
  }

  private calculateUserRelevance(query: string, user: UserProfile): number {
    const queryLower = query.toLowerCase();
    let relevance = 0;

    if (user.username.toLowerCase().includes(queryLower)) {
      relevance += 10;
    }

    if (user.bio && user.bio.toLowerCase().includes(queryLower)) {
      relevance += 5;
    }

    if (user.username.toLowerCase() === queryLower) {
      relevance += 20;
    }

    return relevance;
  }

  private calculateGroupRelevance(query: string, group: Chat): number {
    const queryLower = query.toLowerCase();
    let relevance = 0;

    if (group.name.toLowerCase().includes(queryLower)) {
      relevance += 10;
    }

    if (group.metadata?.description && group.metadata.description.toLowerCase().includes(queryLower)) {
      relevance += 5;
    }

    if (group.name.toLowerCase() === queryLower) {
      relevance += 20;
    }

    return relevance;
  }

  private calculateFileRelevance(query: string, file: any): number {
    const queryLower = query.toLowerCase();
    let relevance = 0;

    if (file.fileName.toLowerCase().includes(queryLower)) {
      relevance += 10;
    }

    if (file.mimeType.toLowerCase().includes(queryLower)) {
      relevance += 3;
    }

    if (file.fileName.toLowerCase() === queryLower) {
      relevance += 20;
    }

    return relevance;
  }

  private sortResults(results: SearchResult[], options: SearchOptions): SearchResult[] {
    const sortBy = options.sortBy || 'relevance';
    const sortOrder = options.sortOrder || 'desc';

    return results.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'relevance':
          comparison = a.relevance - b.relevance;
          break;
        case 'date':
          comparison = (a.timestamp || 0) - (b.timestamp || 0);
          break;
        case 'name':
          comparison = a.title.localeCompare(b.title);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  private limitResults(results: SearchResult[], options: SearchOptions): SearchResult[] {
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    return results.slice(offset, offset + limit);
  }

  private removeDuplicates(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      if (seen.has(result.id)) {
        return false;
      }
      seen.add(result.id);
      return true;
    });
  }

  private extractMessageTitle(result: any): string {
    return result.sender || 'Unknown Sender';
  }

  private extractMessageDescription(result: any): string {
    return result.content || 'No content';
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

export const searchService = new SearchService();
