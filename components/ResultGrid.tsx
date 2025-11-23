import React from 'react';
import { GeneratedImage } from '../types';

interface ResultGridProps {
  items: GeneratedImage[];
  onDownload: (url: string, id: number) => void;
}

export const ResultGrid: React.FC<ResultGridProps> = ({ items, onDownload }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
      {items.map((item) => (
        <div 
          key={item.id} 
          className="relative group bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col"
        >
          {/* Image Area */}
          <div className="aspect-[3/4] bg-gray-100 relative w-full">
            {item.status === 'success' && item.imageUrl ? (
              <img 
                src={item.imageUrl} 
                alt={item.config.label} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                {item.status === 'loading' && (
                  <>
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <span className="text-xs text-gray-500 font-medium">Generating...</span>
                  </>
                )}
                {item.status === 'pending' && (
                  <span className="text-xs text-gray-400">Waiting...</span>
                )}
                {item.status === 'error' && (
                  <span className="text-xs text-red-500">Failed</span>
                )}
              </div>
            )}
            
            {/* Download Overlay */}
            {item.status === 'success' && item.imageUrl && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => item.imageUrl && onDownload(item.imageUrl, item.id)}
                  className="bg-white text-gray-900 rounded-full p-2 hover:bg-gray-100 transition-transform hover:scale-105"
                  title="Download"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 12.75l-4.5-4.5m0 0l4.5-4.5m-4.5 4.5h16.5" transform="rotate(-90 12 12)" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Label Area */}
          <div className="p-2 border-t border-gray-100 bg-white">
            <p className="text-xs font-semibold text-gray-700 truncate text-center">
              {item.config.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
