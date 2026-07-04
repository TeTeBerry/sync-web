type ButtonSpinnerProps = {
  className?: string;
};

export function ButtonSpinner({ className = 'button__spinner' }: ButtonSpinnerProps) {
  return <span className={className} aria-hidden="true" />;
}
