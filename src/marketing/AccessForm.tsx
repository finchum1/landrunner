import { useState, type FormEvent } from "react";

const FIELD =
  "mt-1.5 w-full border-[1.5px] border-ink bg-paper px-3.5 py-3 text-[1.05rem] text-ink placeholder:text-ink-3 focus:bg-white";

export default function AccessForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again in a minute.");
      setState("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="border-[1.5px] border-ink bg-white p-8">
        <p className="cond text-[2rem] font-bold uppercase leading-none">You’re on the log.</p>
        <p className="mt-3 max-w-[30rem] text-[1.08rem] text-ink-2">
          Thanks. We read every request. If it opens up to more landmen, we’ll write to you.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="border-[1.5px] border-ink bg-paper p-6 sm:p-8" noValidate={false}>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="label block">
          Name
          <input name="name" required maxLength={120} autoComplete="name" className={`${FIELD} font-body normal-case tracking-normal text-[1.05rem] !font-normal`} />
        </label>
        <label className="label block">
          Email
          <input name="email" type="email" required maxLength={200} autoComplete="email" className={`${FIELD} font-body normal-case tracking-normal text-[1.05rem] !font-normal`} />
        </label>
      </div>
      <label className="label mt-5 block">
        How do you work?
        <select name="role" defaultValue="" required className={`${FIELD} font-body normal-case tracking-normal text-[1.05rem] !font-normal`}>
          <option value="" disabled>Choose one</option>
          <option>Independent landman</option>
          <option>Leasing or land services firm</option>
          <option>Operator land department</option>
          <option>Something else</option>
        </select>
      </label>
      <label className="label mt-5 block">
        Your next project (optional)
        <textarea name="message" rows={4} maxLength={2000} placeholder="Roughly how many owners, what county, how you track it today." className={`${FIELD} font-body normal-case tracking-normal text-[1.05rem] !font-normal`} />
      </label>
      {/* honeypot: real people never see or fill this */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 opacity-0" />
      {state === "error" && (
        <p role="alert" className="mt-5 border-[1.5px] border-red bg-white px-4 py-3 text-[1rem] text-red">
          {error}
        </p>
      )}
      <button type="submit" disabled={state === "sending"} className="btn btn-primary mt-7 w-full disabled:opacity-60 sm:w-auto">
        {state === "sending" ? "Sending…" : "Request early access"}
      </button>
    </form>
  );
}
