// Loading spinner component
import React from 'react';

const Loader = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-purple-200 rounded-full animate-spin border-t-purple-600"></div>
      </div>
      <p className="text-white font-medium">Loading...</p>
    </div>
  );
};

export default Loader;