/**
 * Test Processing Pipeline
 * This script checks if book processing is working
 * 
 * Usage: node test-processing.js <book-id>
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function testProcessing(bookId) {
  console.log('🔍 Testing processing pipeline for book:', bookId);
  console.log('');

  try {
    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    const mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db(process.env.MONGODB_DB_NAME);
    console.log('✅ Connected to MongoDB\n');

    // Check book metadata
    console.log('📚 Checking book metadata...');
    const metadata = await db.collection('books_metadata').findOne({ book_id: bookId });
    
    if (!metadata) {
      console.log('❌ No metadata found for this book');
      console.log('   This means the book was not created properly');
      await mongoClient.close();
      return;
    }

    console.log('✅ Metadata found:');
    console.log('   - Processing status:', metadata.processing_status);
    console.log('   - Embeddings generated:', metadata.embeddings_generated);
    console.log('   - Total pages:', metadata.total_pages);
    console.log('   - Pinecone IDs:', metadata.pinecone_ids?.length || 0);
    console.log('');

    // Check book pages
    console.log('📄 Checking book pages...');
    const pagesCount = await db.collection('book_pages').countDocuments({ book_id: bookId });
    console.log('✅ Pages found:', pagesCount);
    
    if (pagesCount > 0) {
      const samplePage = await db.collection('book_pages').findOne({ book_id: bookId });
      console.log('   - Sample page number:', samplePage.page_number);
      console.log('   - Has pinecone_id:', !!samplePage.pinecone_id);
      console.log('   - Word count:', samplePage.word_count);
    }
    console.log('');

    // Check processing logs
    console.log('📋 Checking processing logs...');
    const logs = await db.collection('processing_logs')
      .find({ book_id: bookId })
      .sort({ started_at: -1 })
      .limit(10)
      .toArray();

    if (logs.length === 0) {
      console.log('⚠️  No processing logs found');
      console.log('   This means processing was never triggered!');
      console.log('');
      console.log('🔧 Possible causes:');
      console.log('   1. NEXT_PUBLIC_APP_URL is wrong');
      console.log('   2. Processing API route is not accessible');
      console.log('   3. Fetch request failed silently');
      console.log('');
      console.log('Current NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
    } else {
      console.log('✅ Processing logs found:', logs.length);
      console.log('');
      
      logs.forEach((log, i) => {
        const status = log.status === 'failed' ? '❌' : 
                      log.status === 'completed' ? '✅' : 
                      log.status === 'started' ? '🔄' : '⏳';
        console.log(`${status} ${i + 1}. Stage: ${log.stage}, Status: ${log.status}`);
        console.log(`   Message: ${log.message}`);
        if (log.error) {
          console.log(`   ❌ ERROR:`, log.error);
        }
        console.log('');
      });
    }

    await mongoClient.close();

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Book ID:', bookId);
    console.log('Processing Status:', metadata.processing_status);
    console.log('Pages Extracted:', pagesCount);
    console.log('Embeddings Generated:', metadata.embeddings_generated ? 'Yes' : 'No');
    console.log('Pinecone Vectors:', metadata.pinecone_ids?.length || 0);
    console.log('Processing Logs:', logs.length);
    console.log('');

    if (metadata.processing_status === 'completed' && metadata.embeddings_generated) {
      console.log('✅ BOOK PROCESSING SUCCESSFUL!');
      console.log('   The book should appear in AI Tutor');
    } else if (logs.length === 0) {
      console.log('❌ PROCESSING NEVER STARTED!');
      console.log('');
      console.log('🔧 How to fix:');
      console.log('   1. Check server is running on correct port');
      console.log('   2. Verify NEXT_PUBLIC_APP_URL in .env.local');
      console.log('   3. Check server terminal for errors');
      console.log('   4. Try manually triggering processing:');
      console.log('');
      console.log('   curl -X POST http://localhost:3001/api/books/process \\');
      console.log('     -H "Content-Type: application/json" \\');
      console.log(`     -d '{"bookId": "${bookId}", "fileBuffer": "..."}'`);
    } else if (metadata.processing_status === 'failed') {
      console.log('❌ PROCESSING FAILED!');
      console.log('   Check the error logs above for details');
    } else if (metadata.processing_status === 'processing') {
      console.log('⏳ PROCESSING IN PROGRESS...');
      console.log('   Wait a bit longer or check for stuck process');
    } else {
      console.log('⚠️  PROCESSING INCOMPLETE');
      console.log('   Check logs above for what went wrong');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Get book ID from command line
const bookId = process.argv[2];

if (!bookId) {
  console.log('Usage: node test-processing.js <book-id>');
  console.log('');
  console.log('To find book IDs, run:');
  console.log('  mongosh "YOUR_MONGODB_URI"');
  console.log('  use learnbyai_platform');
  console.log('  db.books_metadata.find({}, {book_id: 1, file_name: 1})');
  process.exit(1);
}

testProcessing(bookId);
