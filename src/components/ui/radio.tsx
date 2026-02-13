'use client';

import { createContext, useContext, forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// RadioGroup Context
const RadioGroupContext = createContext<{
  value?: string;
  onChange?: (value: string) => void;
  name?: string;
}>({});

export interface RadioGroupProps {
  value?: string;
  onChange?: (value: string) => void;
  name?: string;
  children: React.ReactNode;
  className?: string;
}

const RadioGroup = ({ value, onChange, name, children, className }: RadioGroupProps) => {
  return (
    <RadioGroupContext.Provider value={{ value, onChange, name }}>
      <div className={cn('flex flex-col gap-2', className)}>{children}</div>
    </RadioGroupContext.Provider>
  );
};

export interface RadioProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string;
  description?: string;
}

const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, description, value, disabled, ...props }, ref) => {
    const context = useContext(RadioGroupContext);

    return (
      <label
        className={cn(
          'flex items-start gap-3',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
      >
        <input
          ref={ref}
          type="radio"
          name={context.name}
          value={value}
          checked={context.value === value}
          disabled={disabled}
          onChange={() => context.onChange?.(value as string)}
          className={cn(
            'mt-0.5 h-4 w-4 border-gray-300',
            'text-blue-600 focus:ring-2 focus:ring-blue-500/20',
            'dark:border-gray-600 dark:bg-gray-950'
          )}
          {...props}
        />
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}
              </span>
            )}
            {description && (
              <span className="text-xs text-gray-500 dark:text-gray-400">{description}</span>
            )}
          </div>
        )}
      </label>
    );
  }
);

Radio.displayName = 'Radio';
RadioGroup.displayName = 'RadioGroup';

export { Radio, RadioGroup };
