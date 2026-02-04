'use client';

import { forwardRef, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fadeInUp } from '@/lib/animations';

export interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  animate?: boolean;
  className?: string;
}

const PageHeader = forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ title, description, icon, action, animate = true, className }, ref) => {
    const animationProps = animate ? fadeInUp : {};

    return (
      <motion.div
        ref={ref}
        className={cn('mb-6 flex items-start justify-between', className)}
        {...animationProps}
      >
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h1 className="text-2xl font-bold text-heading">{title}</h1>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
        </div>
        {action}
      </motion.div>
    );
  }
);

PageHeader.displayName = 'PageHeader';

export { PageHeader };
