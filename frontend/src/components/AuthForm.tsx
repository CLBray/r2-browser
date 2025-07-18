// Authentication form component for user credential input

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { R2Credentials } from '../types';
import { ErrorHandler } from '../utils/error-handler';

export const AuthForm: React.FC = () => {
  const { login } = useAuth();
  const [credentials, setCredentials] = useState<R2Credentials>({
    accountId: '',
    accessKeyId: '',
    secretAccessKey: '',
    bucketName: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await login(credentials);
    } catch (err) {
      // Parse and handle the error
      const apiError = ErrorHandler.parseApiError(err);
      const friendlyMessage = ErrorHandler.getUserFriendlyMessage(apiError);
      
      // Log the error
      ErrorHandler.logError(apiError, { 
        accountId: credentials.accountId,
        bucketName: credentials.bucketName
      });
      
      setError(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof R2Credentials) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCredentials(prev => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Connect to your R2 Bucket
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your Cloudflare R2 credentials to access your files
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="accountId" className="block text-sm font-medium text-gray-700">
                Account ID
              </label>
              <input
                id="accountId"
                name="accountId"
                type="text"
                required
                value={credentials.accountId}
                onChange={handleChange('accountId')}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Your Cloudflare Account ID"
              />
            </div>
            <div>
              <label htmlFor="accessKeyId" className="block text-sm font-medium text-gray-700">
                Access Key ID
              </label>
              <input
                id="accessKeyId"
                name="accessKeyId"
                type="text"
                required
                value={credentials.accessKeyId}
                onChange={handleChange('accessKeyId')}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="R2 Access Key ID"
              />
            </div>
            <div>
              <label htmlFor="secretAccessKey" className="block text-sm font-medium text-gray-700">
                Secret Access Key
              </label>
              <input
                id="secretAccessKey"
                name="secretAccessKey"
                type="password"
                required
                value={credentials.secretAccessKey}
                onChange={handleChange('secretAccessKey')}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="R2 Secret Access Key"
              />
            </div>
            <div>
              <label htmlFor="bucketName" className="block text-sm font-medium text-gray-700">
                Bucket Name
              </label>
              <input
                id="bucketName"
                name="bucketName"
                type="text"
                required
                value={credentials.bucketName}
                onChange={handleChange('bucketName')}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="R2 Bucket Name"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};