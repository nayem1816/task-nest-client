import { SettingsNav } from './settings-nav';

export default function SettingsLayout({ children }: LayoutProps<'/settings'>) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 md:flex-row md:gap-10 lg:px-8 lg:py-8">
      <SettingsNav />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
