import { APP_NAME } from "../AppLogo";
import { AuthHeroPattern } from "./AuthHeroPattern";

const heroPanelClassName = [
  "relative flex min-h-[min(320px,42vh)] shrink-0 flex-col overflow-hidden",
  "bg-[#E8E8ED] dark:bg-black",
  "md:w-[44%] md:max-w-xl md:border-r md:border-black/10 dark:md:border-white/10",
  "lg:w-[42%] lg:max-w-none",
].join(" ");

const featureItems = [
  "Private room access",
  "Realtime conversations",
  "Secure file sharing",
  "Assistant by default",
];

export function AuthHeroPanel() {
  return (
    <section className={heroPanelClassName}>
      <AuthHeroPattern />

      <div className="relative z-1 flex flex-1 flex-col px-6 pb-6 pt-8 md:px-8 md:pb-8 md:pt-10">
        <div className="text-center md:text-left">
          <p className="mb-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500 dark:text-[#636366]">
            Secure gateway
          </p>
          <h2 className="text-balance font-mono text-[1.15rem] font-semibold uppercase leading-snug tracking-[0.06em] text-zinc-900 dark:text-white sm:text-[1.25rem]">
            Open {APP_NAME}
          </h2>
          <p className="mx-auto mt-2.5 max-w-[22rem] text-pretty font-mono text-[11px] font-medium leading-relaxed tracking-wide text-zinc-600 dark:text-[#98989D] md:mx-0 md:max-w-none">
            Chats, photos, and reactions stay in sync—sign in on the right to continue.
          </p>
        </div>

        <div className="relative flex flex-1 items-center justify-center py-6 md:py-5">
          <div className="relative w-full max-w-[22rem]">
            <div className="absolute inset-4 rounded-[2rem] bg-linear-to-br from-accent/18 via-transparent to-[#8FB6FF]/15 blur-2xl dark:from-accent/22 dark:to-[#8FB6FF]/10" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-black/10 bg-white/75 p-4 shadow-[0_18px_45px_-25px_rgba(15,23,42,0.55)] backdrop-blur-xl dark:border-white/10 dark:bg-[#141416]/75 dark:shadow-[0_22px_55px_-23px_rgba(0,0,0,0.9)]">
              <div className="mb-5 flex items-center justify-between gap-3 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500 dark:text-[#98989D]">
                <span className="inline-flex items-center gap-2 rounded-full border border-black/6 bg-black/2 px-2 py-1 dark:border-white/10 dark:bg-white/2">
                  <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
                  Secure session
                </span>
                <span className="rounded-full border border-accent/20 bg-accent/8 px-2 py-1 text-accent dark:border-accent/30 dark:bg-accent/12">
                  Live
                </span>
              </div>

              <div className="space-y-3">
                {featureItems.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-black/6 bg-white/70 px-3 py-2.5 text-left text-[11px] font-medium tracking-wide text-zinc-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] dark:border-white/8 dark:bg-white/3 dark:text-zinc-200"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-accent/20 to-accent/8 text-accent dark:from-accent/30 dark:to-accent/12">
                      <span className="size-2 rounded-full bg-current" aria-hidden />
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="text-center font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-[#636366] md:text-left">
          End-to-end session · Encrypted in transit
        </p>
      </div>
    </section>
  );
}
