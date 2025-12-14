/**
 * Componente Label - MVP con accesibilidad ARIA y contraste mejorado
 */

import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'text-sm font-medium leading-none text-gray-800 dark:text-gray-200',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="text-red-600 dark:text-red-400 ml-1" aria-hidden="true">
          *
        </span>
      )}
      {required && <span className="sr-only">(campo requerido)</span>}
    </label>
  )
);
Label.displayName = 'Label';

export { Label };
