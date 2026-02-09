import React from 'react';
import clsx from 'clsx';

interface LoadingProps {
  message?: React.ReactNode;
  fullScreen?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'h-6 w-6 border-2',
  md: 'h-10 w-10 border-4',
  lg: 'h-14 w-14 border-4',
};

const Loading: React.FC<LoadingProps> = ({ message, fullScreen = false, className, size = 'md' }) => {
  const containerClass = fullScreen
    ? 'min-h-screen flex items-center justify-center'
    : 'flex items-center justify-center py-8';

  return (
    <div className={clsx(containerClass, className)}>
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="relative">
          <div className={clsx('rounded-full border-primary/30 border-t-primary animate-spin', sizeMap[size])} />
          <div className="absolute inset-0 flex items-center justify-center">
            <img src="logo.png" alt="Logo" className="h-3.5 w-3.5 opacity-60" />
          </div>
        </div>
        {message && <div className="text-sm">{message}</div>}
      </div>
    </div>
  );
};

export default Loading;
