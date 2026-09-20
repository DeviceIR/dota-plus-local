import { useEffect, useState } from "react";

type Props = {
  src: string;
  alt: string;
  className?: string;
};

export function SafeImage({ src, alt, className }: Props) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (failed) {
    return <div className={`img-fallback ${className ?? ""}`} title={alt} />;
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
