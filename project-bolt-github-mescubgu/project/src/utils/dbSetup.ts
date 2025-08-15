import { initializeDatabase } from './database';

/**
 * Database setup script
 * Run this to initialize your database with required tables
 */
export const setupDatabase = async () => {
  try {
    console.log('🚀 Starting database setup...');
    
    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    console.log('📊 DATABASE_URL configured');
    
    // Initialize database
    await initializeDatabase();
    
    console.log('✅ Database setup completed successfully!');
    console.log('📋 Created tables:');
    console.log('   - users (with indexes)');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
};

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('Database setup finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database setup failed:', error);
      process.exit(1);
    });
}