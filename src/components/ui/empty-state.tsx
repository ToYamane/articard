'use client';

import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button, type ButtonProps } from './button';
import { fadeInUp } from '@/lib/animations';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: ButtonProps['variant'];
  };
  className?: string;
}

const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, action, className }, ref) => {
    return (
      <motion.div
        ref={ref}
        {...fadeInUp}
        className={cn(
          'flex flex-col items-center justify-center py-16 text-center',
          className
        )}
      >
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 opacity-60 blur-xl dark:from-blue-900 dark:to-purple-900" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-950">
            {icon}
          </div>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-heading">{title}</h3>
        {description && <p className="mb-6 max-w-sm text-muted">{description}</p>}
        {action && (
          <Button variant={action.variant || 'primary'} onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </motion.div>
    );
  }
);

EmptyState.displayName = 'EmptyState';

export { EmptyState };
