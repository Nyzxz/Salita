import type { ReactNode } from 'react';
import { AlertIcon, CheckIcon } from '../common/icons';

interface NoticeProps {
  tone: 'success' | 'error';
  children: ReactNode;
  className?: string;
}

export function Notice({ tone, children, className = '' }: NoticeProps) {
  const isError = tone === 'error';
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`flex animate-fade-in items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
        isError ? 'border-clay/35 bg-clay/10 text-parchment' : 'border-leaf/35 bg-leaf/10 text-parchment'
      } ${className}`}
    >
      <span className={`mt-0.5 flex-none ${isError ? 'text-clay' : 'text-leaf'}`}>
        {isError ? <AlertIcon className="h-4 w-4" /> : <CheckIcon className="h-4 w-4" />}
      </span>
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}
