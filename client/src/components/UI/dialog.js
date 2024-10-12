import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Dialog = ({ children, open, onOpenChange }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => onOpenChange(false)}>
      <div className="bg-background rounded-lg p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        {children}
        <button
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>
  );
};

export const DialogTrigger = ({ children, ...props }) => {
  return React.cloneElement(children, props);
};

export const DialogContent = ({ children, className, ...props }) => {
  return (
    <div
      className={cn(
        "grid w-full gap-4 border bg-background p-6 shadow-lg duration-200",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const DialogHeader = ({ children, className, ...props }) => {
  return (
    <div
      className={cn(
        "flex flex-col space-y-1.5 text-center sm:text-left",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const DialogFooter = ({ children, className, ...props }) => {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const DialogTitle = ({ children, className, ...props }) => {
  return (
    <h2
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className
      )}
      {...props}
    >
      {children}
    </h2>
  );
};

export const DialogDescription = ({ children, className, ...props }) => {
  return (
    <p
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    >
      {children}
    </p>
  );
};
