import { Pool, PoolClient } from 'pg';

// Create a connection pool using the DATABASE_URL environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Execute a SQL query with optional parameters
 * @param text - SQL query string
 * @param params - Query parameters (optional)
 * @returns Query result
 */
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

/**
 * Get a client from the pool for transactions
 * @returns Database client
 */
export const getClient = async (): Promise<PoolClient> => {
  return await pool.connect();
};

/**
 * Close the database pool
 */
export const closePool = async () => {
  await pool.end();
};

/**
 * Test database connection
 * @returns Promise<boolean> - true if connection successful
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    const result = await query('SELECT NOW() as current_time');
    console.log('Database connection successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};

/**
 * Create the users table if it doesn't exist
 */
export const createUsersTable = async (): Promise<void> => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createIndexQuery = `
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
  `;

  try {
    console.log('Creating users table...');
    await query(createTableQuery);
    console.log('Users table created successfully');
    
    console.log('Creating indexes...');
    await query(createIndexQuery);
    console.log('Indexes created successfully');
  } catch (error) {
    console.error('Error creating users table:', error);
    throw error;
  }
};

/**
 * Initialize database - create tables and run setup
 */
export const initializeDatabase = async (): Promise<void> => {
  try {
    console.log('Initializing database...');
    
    // Test connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }
    
    // Create users table
    await createUsersTable();
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

// User-related database operations
export const userOperations = {
  /**
   * Create a new user
   */
  async createUser(userData: {
    username: string;
    email: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
  }) {
    const { username, email, passwordHash, firstName, lastName } = userData;
    
    const insertQuery = `
      INSERT INTO users (username, email, password_hash, first_name, last_name)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, first_name, last_name, is_active, created_at;
    `;
    
    try {
      const result = await query(insertQuery, [username, email, passwordHash, firstName, lastName]);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  /**
   * Get user by ID
   */
  async getUserById(userId: number) {
    const selectQuery = `
      SELECT id, username, email, first_name, last_name, is_active, created_at, updated_at
      FROM users
      WHERE id = $1 AND is_active = true;
    `;
    
    try {
      const result = await query(selectQuery, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw error;
    }
  },

  /**
   * Get user by email
   */
  async getUserByEmail(email: string) {
    const selectQuery = `
      SELECT id, username, email, password_hash, first_name, last_name, is_active, created_at, updated_at
      FROM users
      WHERE email = $1 AND is_active = true;
    `;
    
    try {
      const result = await query(selectQuery, [email]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  },

  /**
   * Update user information
   */
  async updateUser(userId: number, updates: {
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  }) {
    const { username, email, firstName, lastName } = updates;
    
    const updateQuery = `
      UPDATE users
      SET 
        username = COALESCE($2, username),
        email = COALESCE($3, email),
        first_name = COALESCE($4, first_name),
        last_name = COALESCE($5, last_name),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND is_active = true
      RETURNING id, username, email, first_name, last_name, updated_at;
    `;
    
    try {
      const result = await query(updateQuery, [userId, username, email, firstName, lastName]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  /**
   * Soft delete user (set is_active to false)
   */
  async deleteUser(userId: number) {
    const deleteQuery = `
      UPDATE users
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id;
    `;
    
    try {
      const result = await query(deleteQuery, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },

  /**
   * Get all active users with pagination
   */
  async getAllUsers(limit: number = 10, offset: number = 0) {
    const selectQuery = `
      SELECT id, username, email, first_name, last_name, created_at
      FROM users
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2;
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users
      WHERE is_active = true;
    `;
    
    try {
      const [usersResult, countResult] = await Promise.all([
        query(selectQuery, [limit, offset]),
        query(countQuery)
      ]);
      
      return {
        users: usersResult.rows,
        total: parseInt(countResult.rows[0].total),
        limit,
        offset
      };
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }
};

export default pool;