// Authentication form component for user credential input

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { R2Credentials } from '../types';
import { ErrorHandler, ErrorCode } from '../utils/error-handler';

interface ValidationErrors {
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucketName?: string;
}

export const AuthForm: React.FC = () => {
  const { login, isLoading: authLoading } = useAuth();
  const [credentials, setCredentials] = useState<R2Credentials>({
    accountId: '',
    accessKeyId: '',
    secretAccessKey: '',
    bucketName: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  // Clear error when credentials change
  useEffect(() => {
    if (error) {
      setError(null);
    }
  }, [credentials]);

  // Validate credentials before submission
  const validateCredentials = (): boolean => {
    const errors: ValidationErrors = {};
    let isValid = true;

    // Account ID validation (32 character hex string)
    if (credentials.accountId && !/^[a-f0-9]{32}$/.test(credentials.accountId)) {
      errors.accountId = 'Account ID should be a 32 character hexadecimal string';
      isValid = false;
    }

    // Access Key ID validation (should be 20 characters)
    if (credentials.accessKeyId && credentials.accessKeyId.length !== 20) {
      errors.accessKeyId = 'Access Key ID should be 20 characters long';
      isValid = false;
    }

    // Secret Access Key validation (should be 40 characters)
    if (credentials.secretAccessKey && credentials.secretAccessKey.length !== 40) {
      errors.secretAccessKey = 'Secret Access Key should be 40 characters long';
      isValid = false;
    }

    // Bucket name validation (DNS-compliant name)
    if (credentials.bucketName && (!/^[a-z0-9][a-z0-9\-]*[a-z0-9]$/.test(credentials.bucketName) || 
        credentials.bucketName.length < 3 || credentials.bucketName.length > 63)) {
      errors.bucketName = 'Bucket name must be 3-63 characters, lowercase letters, numbers, or hyphens';
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate credentials
    if (!validateCredentials()) {
      return;
    }
    
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
    
    // Clear specific validation error when field changes
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
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
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  validationErrors.accountId ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Your Cloudflare Account ID"
              />
              {validationErrors.accountId && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.accountId}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Found in your Cloudflare dashboard under Account Home
              </p>
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
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  validationErrors.accessKeyId ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="R2 Access Key ID"
              />
              {validationErrors.accessKeyId && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.accessKeyId}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Created in R2 dashboard under "Manage R2 API Tokens"
              </p>
            </div>
            <div>
              <label htmlFor="secretAccessKey" className="block text-sm font-medium text-gray-700">
                Secret Access Key
              </label>
              <div className="relative">
                <input
                  id="secretAccessKey"
                  name="secretAccessKey"
                  type={showPassword ? "text" : "password"}
                  required
                  value={credentials.secretAccessKey}
                  onChange={handleChange('secretAccessKey')}
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                    validationErrors.secretAccessKey ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm pr-10`}
                  placeholder="R2 Secret Access Key"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 mt-1"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
              {validationErrors.secretAccessKey && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.secretAccessKey}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Provided when you created your R2 API Token
              </p>
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
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  validationErrors.bucketName ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="R2 Bucket Name"
              />
              {validationErrors.bucketName && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.bucketName}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                The name of your R2 bucket to explore
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Authentication Error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading || authLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading || authLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting...
                </>
              ) : (
                'Connect to R2'
              )}
            </button>
          </div>
          
          <div className="text-center">
            <a 
              href="https://developers.cloudflare.com/r2/api/s3/tokens/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Need help finding your R2 credentials?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};