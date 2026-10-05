import type { Metadata } from 'next';
import Script from 'next/script';

export const metadata: Metadata = { title: 'Website chat test page', robots: { index: false } };

/**
 * A plain page with nothing on it but the install snippet, so a workspace can
 * try its chat before touching its own site. The widget loads exactly as it
 * would anywhere else.
 */
export default async function WidgetPreviewPage({ params }: PageProps<'/widget-preview/[key]'>) {
  const { key } = await params;
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <p className="text-text-muted text-[12px] font-medium tracking-wide uppercase">Test page</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Your website chat</h1>
      <div className="text-text-muted mt-3 max-w-prose space-y-3">
        <p>
          This page has nothing on it except your install code. The chat button in the corner is the
          real thing: messages you send here arrive in your inbox as a new visitor.
        </p>
        <p>
          If the button does not show up and you limited the chat to certain websites, add this
          site&apos;s address to the list, or check the browser console for the reason.
        </p>
      </div>
      <Script src="/widget.js" data-key={key} strategy="afterInteractive" />
    </main>
  );
}
