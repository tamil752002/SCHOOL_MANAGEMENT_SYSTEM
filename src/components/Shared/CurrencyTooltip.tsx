import { useEffect, useRef, useState } from 'react';

interface CurrencyTooltipProps {
  amount: number;
  children: React.ReactNode;
}

export function CurrencyTooltip({ amount, children }: CurrencyTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const elementRef = useRef<HTMLDiv>(null);

  const formatActualNumber = (num: number): string => {
    return `₹${num.toLocaleString('en-IN')}`;
  };

  return (
    <div
      ref={elementRef}
      className="relative inline-block cursor-help"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setShowTooltip(!showTooltip)}
    >
      {children}
      
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white dark:text-gray-100 rounded text-xs whitespace-nowrap z-50 pointer-events-none">
          {formatActualNumber(amount)}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
        </div>
      )}
    </div>
  );
}
