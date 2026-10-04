import { RequireAuth } from '@/components/auth/guards';
import { WorkspaceProvider } from '@/lib/workspace/workspace-provider';

export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <RequireAuth>
      <WorkspaceProvider>{children}</WorkspaceProvider>
    </RequireAuth>
  );
}
