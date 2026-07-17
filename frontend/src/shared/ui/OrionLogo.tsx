interface OrionLogoProps {
  size?: number;
  className?: string;
}

export function OrionLogo({ size = 40, className }: OrionLogoProps) {
  return (
    <img
      alt=""
      aria-hidden="true"
      className={className}
      height={size}
      src="/orion-icon.png"
      width={size}
    />
  );
}
