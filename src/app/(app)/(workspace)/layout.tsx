import { AppShell } from '@/components/shell/app-shell';
import { RealtimeProvider } from '@/lib/realtime/realtime-provider';

export default function WorkspaceLayout({ children }: LayoutProps<'/'>) {
  return (
    <RealtimeProvider>
      <AppShell>{children}</AppShell>
    </RealtimeProvider>
  );
}
