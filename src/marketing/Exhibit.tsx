// A screenshot set into the page like a log inset: boxed, captioned.
export default function Exhibit({
  src,
  alt,
  title,
  w = 2880,
  h = 1800,
  priority = false,
}: {
  src: string;
  alt: string;
  title: string;
  w?: number;
  h?: number;
  priority?: boolean;
}) {
  return (
    <figure className="border-[1.5px] border-ink bg-paper shadow-[0_10px_24px_-12px_rgba(18,32,31,0.5)]">
      <figcaption className="flex items-center justify-between border-b-[1.5px] border-ink bg-ink px-3 py-1.5 text-paper">
        <span className="cond text-[0.95rem] font-bold uppercase tracking-[0.1em]">{title}</span>
        <span className="label !text-paper/60">sample data</span>
      </figcaption>
      <img src={src} alt={alt} width={w} height={h} loading={priority ? "eager" : "lazy"} decoding="async" className="block h-auto w-full" />
    </figure>
  );
}
