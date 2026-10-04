import { RequireAuth } from '@/components/auth/guards';

export default function AppLayout({ children }: LayoutProps<'/'>) {
  return <RequireAuth>{children}</RequireAuth>;
}
