
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  return (
    <div className="flex justify-center items-center">
      <div
        className={`animate-spin rounded-full border-t-4 border-b-4 border-cyan-500 ${sizeClasses[size]}`}
      ></div>
    </div>
  );
};

export default LoadingSpinner;
