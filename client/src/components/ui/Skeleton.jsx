import React from 'react';

export const Skeleton = ({
  width = '100%',
  height = '20px',
  borderRadius = 'var(--radius-sm)',
  className = '',
  style = {}
}) => {
  return (
    <div
      className={`skeleton-pulse ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style
      }}
      aria-hidden="true"
    />
  );
};
