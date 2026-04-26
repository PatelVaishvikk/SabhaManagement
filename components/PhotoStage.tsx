import Image from "next/image";

interface PhotoStageProps {
  imageUrl?: string;
  logoUrl?: string;
  title: string;
  subtitle?: string;
  className?: string;
}

export function PhotoStage({ imageUrl, logoUrl, title, subtitle, className = "" }: PhotoStageProps) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center overflow-hidden bg-black p-8 text-center text-white ${className}`}>
      {imageUrl ? (
        <Image src={imageUrl} alt="" fill sizes="100vw" className="object-contain" priority />
      ) : (
        <div className="max-w-4xl">
          {logoUrl ? <Image src={logoUrl} alt="" width={260} height={260} className="mx-auto h-56 w-56 object-contain" /> : null}
          <p className="mt-6 text-5xl font-semibold">{title}</p>
          {subtitle ? <p className="mt-3 text-2xl text-white/70">{subtitle}</p> : null}
        </div>
      )}
      {imageUrl ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-8">
          <p className="text-3xl font-semibold drop-shadow">{title}</p>
          {subtitle ? <p className="mt-2 text-lg text-white/75 drop-shadow">{subtitle}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
