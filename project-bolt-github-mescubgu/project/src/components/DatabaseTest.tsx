import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database, User, Plus, Trash2, Edit, CheckCircle, AlertCircle } from 'lucide-react';
import { testConnection, userOperations } from '../utils/database';

interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
}

interface DatabaseTestProps {
  highContrast?: boolean;
}

export const DatabaseTest: React.FC<DatabaseTestProps> = ({ highContrast = false }) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state for creating new user
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    password: ''
  });

  // Test database connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connected = await testConnection();
        setIsConnected(connected);
      } catch (err) {
        setIsConnected(false);
        setError('Failed to connect to database');
      }
    };

    checkConnection();
  }, []);

  const handleTestConnection = async () => {
    setLoading(true);
    setError(null);
    try {
      const connected = await testConnection();
      setIsConnected(connected);
      setSuccess(connected ? 'Database connection successful!' : 'Database connection failed');
    } catch (err) {
      setIsConnected(false);
      setError(err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await userOperations.getAllUsers(10, 0);
      setUsers(result.users);
      setSuccess(`Loaded ${result.users.length} users`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Simple password hashing (in production, use bcrypt or similar)
      const passwordHash = btoa(newUser.password); // Base64 encoding (NOT secure for production)
      
      const createdUser = await userOperations.createUser({
        username: newUser.username,
        email: newUser.email,
        passwordHash,
        firstName: newUser.firstName || undefined,
        lastName: newUser.lastName || undefined
      });

      setUsers(prev => [createdUser, ...prev]);
      setNewUser({ username: '', email: '', firstName: '', lastName: '', password: '' });
      setSuccess('User created successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    setLoading(true);
    setError(null);
    try {
      await userOperations.deleteUser(userId);
      setUsers(prev => prev.filter(user => user.id !== userId));
      setSuccess('User deleted successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto p-6 space-y-6"
    >
      {/* Header */}
      <div className="text-center">
        <div className={`inline-flex items-center space-x-3 mb-4 ${
          highContrast ? 'text-white' : 'text-gray-800'
        }`}>
          <Database size={48} className={highContrast ? 'text-blue-400' : 'text-blue-600'} />
          <h1 className="text-3xl font-bold">PostgreSQL Database Test</h1>
        </div>
        <p className={`text-lg ${highContrast ? 'text-gray-300' : 'text-gray-600'}`}>
          Test your database connection and manage users
        </p>
      </div>

      {/* Connection Status */}
      <div className={`p-6 rounded-lg ${
        highContrast ? 'bg-gray-800 border-2 border-gray-600' : 'bg-white shadow-lg'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-semibold ${highContrast ? 'text-white' : 'text-gray-800'}`}>
            Database Connection
          </h2>
          <button
            onClick={handleTestConnection}
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 ${
              highContrast
                ? 'bg-blue-700 text-white hover:bg-blue-600 focus:ring-blue-400'
                : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
            }`}
          >
            {loading ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        {isConnected !== null && (
          <div className={`flex items-center space-x-2 p-3 rounded-lg ${
            isConnected
              ? highContrast ? 'bg-green-900 text-green-300' : 'bg-green-50 text-green-800'
              : highContrast ? 'bg-red-900 text-red-300' : 'bg-red-50 text-red-800'
          }`}>
            {isConnected ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span>
              {isConnected ? 'Connected to PostgreSQL database' : 'Failed to connect to database'}
            </span>
          </div>
        )}
      </div>

      {/* Create User Form */}
      <div className={`p-6 rounded-lg ${
        highContrast ? 'bg-gray-800 border-2 border-gray-600' : 'bg-white shadow-lg'
      }`}>
        <h2 className={`text-xl font-semibold mb-4 ${highContrast ? 'text-white' : 'text-gray-800'}`}>
          Create New User
        </h2>
        
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Username"
              value={newUser.username}
              onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
              required
              className={`px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-4 focus:ring-opacity-50 ${
                highContrast
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-400 focus:ring-blue-400'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500'
              }`}
            />
            <input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
              required
              className={`px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-4 focus:ring-opacity-50 ${
                highContrast
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-400 focus:ring-blue-400'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500'
              }`}
            />
            <input
              type="text"
              placeholder="First Name (optional)"
              value={newUser.firstName}
              onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
              className={`px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-4 focus:ring-opacity-50 ${
                highContrast
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-400 focus:ring-blue-400'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500'
              }`}
            />
            <input
              type="text"
              placeholder="Last Name (optional)"
              value={newUser.lastName}
              onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
              className={`px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-4 focus:ring-opacity-50 ${
                highContrast
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-400 focus:ring-blue-400'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500'
              }`}
            />
            <input
              type="password"
              placeholder="Password"
              value={newUser.password}
              onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
              required
              className={`px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-4 focus:ring-opacity-50 md:col-span-2 ${
                highContrast
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-400 focus:ring-blue-400'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500'
              }`}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 ${
              highContrast
                ? 'bg-green-700 text-white hover:bg-green-600 focus:ring-green-400'
                : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
            }`}
          >
            <Plus size={20} />
            <span>{loading ? 'Creating...' : 'Create User'}</span>
          </button>
        </form>
      </div>

      {/* Users List */}
      <div className={`p-6 rounded-lg ${
        highContrast ? 'bg-gray-800 border-2 border-gray-600' : 'bg-white shadow-lg'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-semibold ${highContrast ? 'text-white' : 'text-gray-800'}`}>
            Users ({users.length})
          </h2>
          <button
            onClick={handleLoadUsers}
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 ${
              highContrast
                ? 'bg-blue-700 text-white hover:bg-blue-600 focus:ring-blue-400'
                : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
            }`}
          >
            {loading ? 'Loading...' : 'Load Users'}
          </button>
        </div>

        {users.length > 0 ? (
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  highContrast
                    ? 'border-gray-600 bg-gray-700'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <User size={20} className={highContrast ? 'text-blue-400' : 'text-blue-600'} />
                  <div>
                    <p className={`font-medium ${highContrast ? 'text-white' : 'text-gray-800'}`}>
                      {user.first_name && user.last_name 
                        ? `${user.first_name} ${user.last_name}` 
                        : user.username}
                    </p>
                    <p className={`text-sm ${highContrast ? 'text-gray-300' : 'text-gray-600'}`}>
                      {user.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteUser(user.id)}
                  disabled={loading}
                  className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 ${
                    highContrast
                      ? 'text-red-400 hover:bg-red-900 focus:ring-red-400'
                      : 'text-red-600 hover:bg-red-50 focus:ring-red-500'
                  }`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className={`text-center py-8 ${highContrast ? 'text-gray-400' : 'text-gray-500'}`}>
            No users found. Create your first user above.
          </p>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg ${
            highContrast ? 'bg-red-900 text-red-300' : 'bg-red-50 text-red-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg ${
            highContrast ? 'bg-green-900 text-green-300' : 'bg-green-50 text-green-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle size={20} />
            <span>{success}</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};