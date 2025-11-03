import { Pinecone } from "@pinecone-database/pinecone";

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const indexName = process.env.PINECONE_INDEX_NAME || "learnbyai-content";
const namespace = process.env.PINECONE_NAMESPACE || "books";

/**
 * Get Pinecone index
 */
export function getPineconeIndex() {
  return pinecone.index(indexName);
}

/**
 * Sanitize metadata to remove invalid characters
 */
function sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === 'string') {
      // Remove surrogate pairs and control characters
      sanitized[key] = value.replace(/[\uD800-\uDFFF]/g, '').replace(/[\x00-\x1F\x7F]/g, ' ');
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Upsert vectors to Pinecone
 */
export async function upsertVectors(
  vectors: Array<{
    id: string;
    values: number[];
    metadata: Record<string, any>;
  }>,
  bookId?: string
) {
  try {
    console.log(`📌 Upserting ${vectors.length} vectors to Pinecone...`);
    console.log(`   Index: ${indexName}`);
    console.log(`   Namespace: ${namespace}`);
    console.log(`   First vector dimensions: ${vectors[0]?.values.length || 0}`);
    
    // Sanitize all metadata before uploading
    const sanitizedVectors = vectors.map(v => ({
      ...v,
      metadata: sanitizeMetadata(v.metadata),
    }));
    
    const index = getPineconeIndex();
    await index.namespace(namespace).upsert(sanitizedVectors);
    
    console.log(`✅ Successfully upserted ${vectors.length} vectors`);
  } catch (error: any) {
    console.error("❌ Error upserting vectors to Pinecone:");
    console.error("   Index:", indexName);
    console.error("   Namespace:", namespace);
    console.error("   Vector count:", vectors.length);
    console.error("   Error:", error.message || error);
    if (error.response) {
      console.error("   Response:", error.response);
    }
    throw error;
  }
}

/**
 * Query similar vectors from Pinecone
 */
export async function querySimilarVectors(
  queryVector: number[],
  topK: number = 5,
  filter?: Record<string, any>
) {
  try {
    const index = getPineconeIndex();
    const queryResponse = await index.namespace(namespace).query({
      vector: queryVector,
      topK,
      includeMetadata: true,
      filter,
    });

    return queryResponse.matches || [];
  } catch (error) {
    console.error("Error querying Pinecone:", error);
    throw error;
  }
}

/**
 * Query vectors from Pinecone (alias for querySimilarVectors)
 */
export async function queryVectors(
  queryVector: number[],
  options?: {
    topK?: number;
    filter?: Record<string, any>;
  }
) {
  return querySimilarVectors(
    queryVector,
    options?.topK || 5,
    options?.filter
  );
}

/**
 * Delete vectors from Pinecone
 */
export async function deleteVectors(ids: string[]) {
  try {
    const index = getPineconeIndex();
    await index.namespace(namespace).deleteMany(ids);
  } catch (error) {
    console.error("Error deleting vectors from Pinecone:", error);
    throw error;
  }
}

/**
 * Delete all vectors for a book
 */
export async function deleteBookVectors(bookId: string) {
  try {
    const index = getPineconeIndex();
    await index.namespace(namespace).deleteMany({
      book_id: bookId,
    });
  } catch (error) {
    console.error("Error deleting book vectors from Pinecone:", error);
    throw error;
  }
}
