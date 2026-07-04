type BrandLogoProps = {
  className?: string;
  height?: number;
};

export function BrandLogo({ className, height = 28 }: BrandLogoProps) {
  const width = Math.round((height * 248) / 100);

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="0 0 248 100"
      role="img"
      aria-label="Rraven"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="0"
        y="78"
        fill="currentColor"
        fontFamily="var(--font-display), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="88"
        fontWeight="700"
      >
        R
      </text>
      <text
        x="62"
        y="72"
        fill="currentColor"
        fontFamily="var(--font-display), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="52"
        fontWeight="700"
      >
        raven
      </text>
    </svg>
  );
}
