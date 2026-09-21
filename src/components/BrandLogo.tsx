'use client';

type Props = {
  /** Compact mark for auth / secondary screens. Default: hero on landing. */
  size?: 'sm' | 'md' | 'lg';
  alt?: string;
};

const SIZES = {
  sm: 72,
  md: 112,
  lg: 160,
} as const;

/** Official Grade wordmark+icon (addendum logo refresh). */
export function BrandLogo({ size = 'md', alt = 'Grade' }: Props) {
  const px = SIZES[size];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/assets/ui/grade_logo_sm.png?v=2`}
      alt={alt}
      width={px}
      height={px}
      style={{ display: 'block', margin: '0 auto' }}
    />
  );
}
