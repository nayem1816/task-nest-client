import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { AcceptInvitation } from './accept-invitation';

const auth = vi.hoisted(() => ({
  state: { status: 'anonymous', user: null } as {
    status: string;
    user: { email: string } | null;
  },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('token=tok_abcdefghijklmnopqrstuvwxyz'),
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock('@/lib/auth/auth-provider', () => ({
  useAuth: () => ({ state: auth.state, signOut: vi.fn() }),
}));

const preview = {
  organizationName: 'Northstar Coffee',
  invitedBy: 'Maya Chen',
  email: 'tom@northstarcoffee.co',
  roleName: 'Agent',
  expiresAt: '2026-10-11T00:00:00.000Z',
};

function renderPage() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(preview)),
  );
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <AcceptInvitation />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AcceptInvitation', () => {
  it('offers sign up with the invited email pre-filled when signed out', async () => {
    auth.state = { status: 'anonymous', user: null };
    renderPage();

    const signup = await screen.findByRole('link', { name: 'Create an account to join' });
    const href = new URL(signup.getAttribute('href')!, 'http://app.test');
    expect(href.pathname).toBe('/signup');
    expect(href.searchParams.get('email')).toBe('tom@northstarcoffee.co');
    expect(href.searchParams.get('next')).toMatch(/^\/invite\?token=/);
    expect(screen.getByText(/Maya Chen invited/)).toHaveTextContent('Northstar Coffee');
  });

  it('lets the invited person join', async () => {
    auth.state = { status: 'authenticated', user: { email: 'Tom@NorthstarCoffee.co' } };
    renderPage();

    expect(await screen.findByRole('button', { name: 'Join Northstar Coffee' })).toBeEnabled();
  });

  it('explains when someone else is signed in', async () => {
    auth.state = { status: 'authenticated', user: { email: 'sam@northstarcoffee.co' } };
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "You're signed in as sam@northstarcoffee.co. This invitation is for tom@northstarcoffee.co.",
    );
    expect(screen.queryByRole('button', { name: /Join/ })).not.toBeInTheDocument();
  });
});
