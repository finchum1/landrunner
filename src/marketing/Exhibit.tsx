// A real screenshot of the app, set into the page like a framed exhibit. On
// phones it swaps to the app's own phone layout so the text stays readable.
export default function Exhibit({
  src,
  phoneSrc,
  alt,
  title,
  priority = false,
}: {
  src: string;
  phoneSrc?: string;
  alt: string;
  title: string;
  priority?: boolean;
}) {
  const loading = priority ? "eager" : "lazy";
  return (
    <figure className="border-[1.5px] border-ink bg-paper shadow-[0_10px_24px_-12px_var(--jsl-shadow)]">
      <figcaption className="flex items-center justify-between border-b-[1.5px] border-ink bg-[var(--jsl-tail-bg)] px-3 py-1.5 text-[color:var(--jsl-tail-fg)]">
        <span className="cond text-[1.05rem] font-bold uppercase tracking-[0.1em]">{title}</span>
        <span className="label !text-[color:var(--jsl-tail-fg)] opacity-60">sample data</span>
      </figcaption>
      {phoneSrc ? (
        <>
          <img src={src} alt={alt} width={2360} height={1480} loading={loading} decoding="async" className="jsl-shot hidden h-auto w-full md:block" />
          <div className="bg-paper-2 px-4 py-5 md:hidden">
            <img
              src={phoneSrc}
              alt={alt}
              width={780}
              height={1688}
              loading={loading}
              decoding="async"
              className="jsl-shot mx-auto block h-auto w-full max-w-[280px] border-[1.5px] border-ink"
            />
          </div>
        </>
      ) : (
        <img src={src} alt={alt} width={2360} height={1480} loading={loading} decoding="async" className="jsl-shot block h-auto w-full" />
      )}
    </figure>
  );
}
