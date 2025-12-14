/**
 * Componente Select - MVP con accesibilidad ARIA y contraste mejorado
 */

import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, id, ...props }, ref) => {
    // Generar un ID único si no se proporciona uno
    const selectId = id || React.useId();
    const errorId = error ? `${selectId}-error` : undefined;

    return (
      <div className="w-full">
        <select
          id={selectId}
          className={cn(
            'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100',
            // Dark mode
            'dark:border-gray-600 dark:bg-gray-800 dark:text-white',
            'dark:focus-visible:ring-blue-500 dark:focus-visible:ring-offset-gray-900',
            'dark:disabled:bg-gray-700',
            error && 'border-red-500 focus-visible:ring-red-500 dark:border-red-400',
            className
          )}
          ref={ref}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={errorId}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p id={errorId} className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
