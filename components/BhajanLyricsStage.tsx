import Image from "next/image";
import type { BhajanDoc } from "@/types";

interface BhajanLyricsStageProps {
  bhajan?: BhajanDoc | null;
  logoUrl?: string;
  className?: string;
}

export function BhajanLyricsStage({ bhajan, logoUrl, className = "" }: BhajanLyricsStageProps) {
  const lyrics = normalizeLyrics(bhajan?.lyricsText ?? "");
  const title = bhajan?.title ?? "Bhajan";
  const notes = bhajan?.notes ?? "";
  const lineCount = lyrics ? lyrics.split("\n").filter(Boolean).length : 0;
  const dense = lyrics.length > 850 || lineCount > 13;

  if (!lyrics) {
    return (
      <div className={`absolute inset-0 flex items-center justify-center overflow-hidden bg-black p-8 text-center text-white ${className}`}>
        {bhajan?.imageUrl ? <Image src={bhajan.imageUrl} alt="" fill sizes="100vw" className="object-contain" priority /> : null}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-8">
          <p className="text-3xl font-semibold drop-shadow">{title}</p>
          {notes ? <p className="mt-2 text-lg text-white/75 drop-shadow">{notes}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className={`absolute inset-0 overflow-hidden bg-black text-white ${className}`} lang="gu">
      <div className="relative z-10 flex h-full flex-col px-[5vw] py-[4.5vh]">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/15 pb-4">
          <div className="min-w-0">
            <p className="line-clamp-1 text-[clamp(1.8rem,3vw,3.8rem)] font-semibold leading-tight tracking-normal">{title}</p>
            {notes ? <p className="mt-1 line-clamp-1 text-[clamp(1rem,1.4vw,1.8rem)] text-white/70">{notes}</p> : null}
          </div>
          {logoUrl ? <Image src={logoUrl} alt="" width={96} height={96} className="h-[clamp(3rem,6vw,6rem)] w-[clamp(3rem,6vw,6rem)] object-contain" /> : null}
        </header>

        <div className="flex min-h-0 flex-1 items-center justify-center py-[4vh]">
          <pre
            className={`m-0 w-full whitespace-pre-wrap text-center font-sans font-semibold leading-[1.28] tracking-normal text-white ${
              dense
                ? "max-h-full overflow-hidden text-[clamp(1.7rem,3.25vw,3.8rem)] xl:columns-2 xl:gap-[5vw]"
                : "max-w-[92vw] text-[clamp(2.5rem,5.4vw,6.6rem)]"
            }`}
            style={{ textShadow: "0 0.08em 0.25em rgba(0,0,0,0.75)" }}
          >
            {lyrics}
          </pre>
        </div>

        <footer className="shrink-0 border-t border-white/15 pt-3 text-center text-[clamp(0.9rem,1.2vw,1.4rem)] text-white/55">
          Sing together
        </footer>
      </div>
    </div>
  );
}

function normalizeLyrics(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
