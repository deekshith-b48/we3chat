// Simple in-memory search index implementation
// In production, you would use Elasticsearch, Algolia, or similar

interface IndexDocument {
  id: string;
  [key: string]: any;
}

interface SearchFilters {
  [key: string]: any;
}

interface SearchOptions {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
}

// In-memory storage for indexes
const indexes: Map<string, Map<string, IndexDocument>> = new Map();

/**
 * Create or update a document in the index
 */
export async function createIndex(indexName: string, document: IndexDocument): Promise<void> {
  if (!indexes.has(indexName)) {
    indexes.set(indexName, new Map());
  }

  const index = indexes.get(indexName)!;
  index.set(document.id, document);
}

/**
 * Search documents in the index
 */
export async function searchIndex(
  indexName: string, 
  options: SearchOptions
): Promise<IndexDocument[]> {
  const index = indexes.get(indexName);
  if (!index) {
    return [];
  }

  const { query, filters = {}, limit = 50, offset = 0 } = options;
  
  // Get all documents
  let documents = Array.from(index.values());

  // Apply filters
  if (Object.keys(filters).length > 0) {
    documents = documents.filter(doc => {
      return Object.entries(filters).every(([key, value]) => {
        if (typeof value === 'object' && value.$gte !== undefined) {
          return doc[key] >= value.$gte;
        }
        if (typeof value === 'object' && value.$lte !== undefined) {
          return doc[key] <= value.$lte;
        }
        return doc[key] === value;
      });
    });
  }

  // Simple text search (in production, use proper full-text search)
  if (query && query.trim()) {
    const searchTerms = query.toLowerCase().split(/\s+/);
    documents = documents.filter(doc => {
      const searchableText = [
        doc.content,
        doc.senderAddress,
        doc.type
      ].join(' ').toLowerCase();
      
      return searchTerms.every(term => searchableText.includes(term));
    });

    // Simple scoring based on term frequency
    documents = documents.map(doc => ({
      ...doc,
      score: calculateScore(doc, searchTerms)
    }));

    // Sort by score (highest first)
    documents.sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  // Apply pagination
  return documents.slice(offset, offset + limit);
}

/**
 * Delete a document from the index
 */
export async function deleteFromIndex(indexName: string, documentId: string): Promise<void> {
  const index = indexes.get(indexName);
  if (index) {
    index.delete(documentId);
  }
}

/**
 * Get index statistics
 */
export function getIndexStats(indexName: string): {
  documentCount: number;
  indexSize: number;
} {
  const index = indexes.get(indexName);
  if (!index) {
    return { documentCount: 0, indexSize: 0 };
  }

  return {
    documentCount: index.size,
    indexSize: JSON.stringify(Array.from(index.values())).length
  };
}

/**
 * Clear an index
 */
export function clearIndex(indexName: string): void {
  indexes.delete(indexName);
}

/**
 * List all indexes
 */
export function listIndexes(): string[] {
  return Array.from(indexes.keys());
}

/**
 * Simple scoring function
 */
function calculateScore(doc: IndexDocument, searchTerms: string[]): number {
  const searchableText = [
    doc.content,
    doc.senderAddress,
    doc.type
  ].join(' ').toLowerCase();

  let score = 0;
  
  searchTerms.forEach(term => {
    // Count occurrences of the term
    const matches = (searchableText.match(new RegExp(term, 'g')) || []).length;
    score += matches;
    
    // Bonus for exact matches
    if (searchableText.includes(term)) {
      score += 1;
    }
  });

  return score;
}

/**
 * Export all indexes (for backup)
 */
export function exportIndexes(): Record<string, IndexDocument[]> {
  const result: Record<string, IndexDocument[]> = {};
  
  for (const [indexName, index] of indexes) {
    result[indexName] = Array.from(index.values());
  }
  
  return result;
}

/**
 * Import indexes (for restore)
 */
export function importIndexes(data: Record<string, IndexDocument[]>): void {
  for (const [indexName, documents] of Object.entries(data)) {
    const index = new Map<string, IndexDocument>();
    documents.forEach(doc => {
      index.set(doc.id, doc);
    });
    indexes.set(indexName, index);
  }
}
