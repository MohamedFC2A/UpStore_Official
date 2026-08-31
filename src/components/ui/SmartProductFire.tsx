'use client';

import React from 'react';
import { Star } from 'lucide-react';

export function StarRating({
  rating,
  size = 'sm',
}: {
  rating: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}) {
  const sizeMap = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };
  const iconSize = sizeMap[size] || sizeMap.sm;

  const stars = [];
  for (let i = 1; i <= 5; i++) {
    let fillPercent = 0;
    if (rating >= i) {
      fillPercent = 100;
    } else if (rating > i - 1) {
      fillPercent = Math.round((rating - (i - 1)) * 100);
    }

    stars.push(
      <div key={i} className={`relative ${iconSize} flex-shrink-0 select-none`}>
        {/* Background Empty Star */}
        <Star
          className="absolute top-0 left-0 w-full h-full text-white/15 fill-white/5"
          strokeWidth={1.5}
        />
        {/* Filled Portion Star */}
        {fillPercent > 0 && (
          <div
            className="absolute top-0 left-0 h-full overflow-hidden"
            style={{ width: `${fillPercent}%` }}
          >
            <Star
              className={`${iconSize} fill-amber-400 text-amber-400`}
              strokeWidth={1.5}
            />
          </div>
        )}
      </div>
    );
  }

  // Force LTR direction so stars always fill from 1st star on left to 5th star on right without RTL inversion bugs
  return (
    <div className="flex items-center gap-0.5" dir="ltr">
      {stars}
    </div>
  );
}
