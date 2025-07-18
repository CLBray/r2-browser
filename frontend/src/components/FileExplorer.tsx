// Main file explorer component - placeholder for now

import React from 'react';

export const FileExplorer: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            File Explorer
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Your R2 bucket file explorer will appear here.</p>
          </div>
          <div className="mt-5">
            <div className="rounded-md bg-blue-50 p-4">
              <div className="text-sm text-blue-700">
                File explorer functionality will be implemented in subsequent tasks.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};