/**
 * Cleanup Script for Failed Book Uploads
 * 
 * This script cleans up failed book records from Supabase and MongoDB
 * Run this before trying to upload again
 * 
 * Usage:
 * node cleanup-failed-books.js
 */

const { MongoClient } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function cleanup() {
  console.log('🧹 Starting cleanup...\n');

  // MongoDB cleanup
  try {
    console.log('📦 Connecting to MongoDB...');
    const mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db(process.env.MONGODB_DB_NAME);

    // Delete failed/pending metadata
    const metadataResult = await db.collection('books_metadata').deleteMany({
      processing_status: { $ne: 'completed' }
    });
    console.log(`✅ Deleted ${metadataResult.deletedCount} failed metadata records`);

    // Get remaining book IDs
    const validBookIds = await db.collection('books_metadata').distinct('book_id');

    // Delete orphaned pages
    const pagesResult = await db.collection('book_pages').deleteMany({
      book_id: { $nin: validBookIds }
    });
    console.log(`✅ Deleted ${pagesResult.deletedCount} orphaned page records`);

    // Clear processing logs
    const logsResult = await db.collection('processing_logs').deleteMany({});
    console.log(`✅ Deleted ${logsResult.deletedCount} processing log records`);

    await mongoClient.close();
    console.log('✅ MongoDB cleanup complete\n');
  } catch (error) {
    console.error('❌ MongoDB cleanup error:', error.message);
  }

  // Supabase cleanup
  try {
    console.log('📦 Connecting to Supabase...');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Delete failed/processing books
    const { data, error } = await supabase
      .from('books')
      .delete()
      .in('status', ['processing', 'failed']);

    if (error) throw error;

    console.log(`✅ Deleted ${data?.length || 0} failed book records`);
    console.log('✅ Supabase cleanup complete\n');
  } catch (error) {
    console.error('❌ Supabase cleanup error:', error.message);
  }

  console.log('🎉 Cleanup complete! You can now upload books again.\n');
  console.log('Next steps:');
  console.log('1. Restart your dev server: npm run dev');
  console.log('2. Upload a book');
  console.log('3. Wait 30-60 seconds');
  console.log('4. Check AI Tutor\n');
}

cleanup().catch(console.error);
