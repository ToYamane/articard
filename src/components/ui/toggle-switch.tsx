'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled = false,
  className,
}: ToggleSwitchProps) {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        'flex items-center gap-3',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      {/* スイッチトラック */}
      <motion.div
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors',
          checked
            ? 'bg-blue-600 dark:bg-blue-500'
            : 'bg-gray-300 dark:bg-gray-800'
        )}
        animate={{
          backgroundColor: checked ? '#2563eb' : '#d1d5db',
        }}
        transition={{ duration: 0.2 }}
      >
        {/* スイッチつまみ */}
        <motion.div
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md"
          animate={{
            x: checked ? 22 : 2,
          }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
          }}
        />
      </motion.div>

      {/* ラベル */}
      {label && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
      )}
    </button>
  );
}
