import { Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface AuthShellProps {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col px-6 py-8 sm:px-10">
        <Link href="/" className="flex w-fit items-center gap-2" aria-label="TaskNest home">
          <Image src="/brand/tasknest-mark.png" alt="" width={28} height={27} />
          <span className="text-[15px] font-semibold tracking-tight">TaskNest</span>
        </Link>

        <main className="mx-auto flex w-full max-w-[360px] flex-1 flex-col justify-center py-12">
          <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-text-muted mt-1.5">{description}</p>}
          <div className="mt-7">{children}</div>
          {footer && <div className="text-text-muted mt-6 text-[13px]">{footer}</div>}
        </main>
      </div>

      <ProductGlimpse />
    </div>
  );
}

/**
 * A still of the inbox: one customer question and the AI draft waiting for
 * review. It shows the product's core idea (AI drafts, people decide) better
 * than a slogan would. Decorative, so hidden from assistive tech.
 */
function ProductGlimpse() {
  return (
    <aside
      aria-hidden
      className="bg-canvas border-border hidden flex-col justify-center border-l px-12 lg:flex"
    >
      <div className="mx-auto w-full max-w-[420px] space-y-3">
        <div className="text-text-muted flex items-center justify-between text-[12px]">
          <span>Website chat · Sarah Mitchell</span>
          <span className="tabular">2:41 PM</span>
        </div>

        <div className="border-border bg-surface w-[85%] rounded-[10px] border px-3.5 py-2.5 text-[13px]">
          Hi, I ordered the black hoodie last Thursday. Do you know when it will arrive?
        </div>

        <div className="border-ai/25 bg-surface ml-auto w-[92%] rounded-[10px] border">
          <div className="text-ai flex items-center gap-1.5 px-3.5 pt-2.5 text-[12px] font-medium">
            <Sparkles className="size-3.5" />
            AI draft
            <span className="text-text-muted ml-auto font-normal">92% confident</span>
          </div>
          <p className="px-3.5 py-2 text-[13px]">
            Hi Sarah! I found your order #10482. It&apos;s with the courier and should arrive
            tomorrow.
          </p>
          <div className="border-border text-text-muted flex items-center justify-between border-t px-3.5 py-2 text-[12px]">
            <span>Used: Shipping Policy → Delivery Times</span>
            <span className="bg-brand rounded-md px-2 py-0.5 font-medium text-white">Send</span>
          </div>
        </div>

        <p className="text-text-muted pt-6 text-[13px]">
          The AI drafts from your own policies and order data. Your team reviews before anything
          goes out.
        </p>
      </div>
    </aside>
  );
}
