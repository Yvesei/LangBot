import Image from 'next/image';

const LOGOS = {
  neo: '/branding/languify-neo-green.png',
  original: '/branding/languify-original.png',
};

export function Logo() {
  return (
    <>
      {Object.entries(LOGOS).map(([theme, src]) => (
        <Image
          key={theme}
          src={src}
          alt=""
          width={64}
          height={64}
          sizes="64px"
          loading="eager"
          data-theme-content={theme}
          className="brand-logo h-full w-full object-contain"
        />
      ))}
    </>
  );
}
