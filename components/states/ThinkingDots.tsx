type ThinkingDotsProps = {
  size?: 'sm' | 'md';
  className?: string;
  label?: string;
};

export function ThinkingDots({ size = 'md', className = '', label }: ThinkingDotsProps) {
  return (
    <span
      className={`thinking-dots thinking-dots--${size}${className ? ` ${className}` : ''}`}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'status' : undefined}
    >
      <span />
      <span />
      <span />
    </span>
  );
}
