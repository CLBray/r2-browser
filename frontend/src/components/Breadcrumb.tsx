// Breadcrumb component for file path navigation

import React from 'react';

interface BreadcrumbProps {
  path: string;
  onNavigate: (path: string) => void;
  isLoading: boolean;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ path, onNavigate, isLoading }) => {
  // Split the path into segments
  const segments = path ? path.split('/').filter(Boolean) : [];
  
  // Generate breadcrumb items with paths
  const breadcrumbItems = React.useMemo(() => {
    const items = [{ name: 'Home', path: '' }];
    
    let currentPath = '';
    segments.forEach(segment => {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      items.push({ name: segment, path: currentPath });
    });
    
    return items;
  }, [segments]);

  return (
    <nav className="flex py-4 px-4 bg-white/30 backdrop-blur-sm border-b border-gray-100" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1 md:space-x-2 flex-wrap">
        {breadcrumbItems.map((item, index) => (
          <li key={item.path || 'home'} className="flex items-center">
            {index > 0 && (
              <svg className="flex-shrink-0 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            )}
            <button
              onClick={() => onNavigate(item.path)}
              disabled={isLoading || (index === breadcrumbItems.length - 1)}
              className={`ml-1 text-sm font-medium px-2 py-1 rounded-lg transition-all duration-200 ${
                index === breadcrumbItems.length - 1
                  ? 'text-gray-700 cursor-default bg-white/50'
                  : 'bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent hover:from-sky-700 hover:to-indigo-700 hover:bg-sky-50 hover:bg-clip-border hover:text-sky-700'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-current={index === breadcrumbItems.length - 1 ? 'page' : undefined}
            >
              {item.name === 'Home' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
              ) : (
                item.name
              )}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
};