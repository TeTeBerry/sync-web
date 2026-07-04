import Image from 'next/image';

type EventImageProps = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
};

export function EventImage({
  src,
  alt,
  className,
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
}: EventImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      priority={priority}
      quality={priority ? 85 : 75}
    />
  );
}
