'use client';

import { forwardRef, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fadeInUp } from '@/lib/animations';

export interface SectionContainerProps
  extends Omit<HTMLMotionProps<'section'>, 'ref' | 'title' | 'children'> {
  variant?: 'default' | 'info' | 'warning' | 'danger' | 'success';
  title?: string;
  description?: string;
  icon?: ReactNode;
  animate?: boolean;
  delay?: number;
  children?: ReactNode;
}

const SectionContainer = forwardRef<HTMLElement, SectionContainerProps>(
  (
    {
      className,
      variant = 'default',
      title,
      description,
      icon,
      animate = true,
      delay = 0,
      children,
      ...props
    },
    ref
  ) => {
    const animationProps = animate
      ? {
          ...fadeInUp,
          transition: { ...fadeInUp.transition, delay },
        }
      : {};

    return (
      <motion.section
        ref={ref}
        className={cn(`section-box-${variant}`, className)}
        {...animationProps}
        {...props}
      >
        {(title || icon) && (
          <div className="mb-4 flex items-center gap-3">
            {icon}
            <div>
              {title && <h2 className="text-lg font-semibold text-heading">{title}</h2>}
              {description && <p className="text-sm text-muted">{description}</p>}
            </div>
          </div>
        )}
        {children}
      </motion.section>
    );
  }
);

SectionContainer.displayName = 'SectionContainer';

export { SectionContainer };
