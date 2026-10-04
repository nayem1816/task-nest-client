import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './login-form';

const acceptSession = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock('@/lib/auth/auth-provider', () => ({
  useAuth: () => ({ state: { status: 'anonymous', user: null }, acceptSession }),
}));

function renderForm() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LoginForm />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  acceptSession.mockReset();
});

describe('LoginForm', () => {
  it('explains what is missing before calling the API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderForm();

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the API's message when the credentials are wrong", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          {
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'That email and password combination is not right.',
            },
          },
          { status: 401 },
        ),
      ),
    );
    renderForm();

    await userEvent.type(screen.getByLabelText('Email'), 'maya@northstarcoffee.co');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That email and password combination is not right.',
    );
    expect(acceptSession).not.toHaveBeenCalled();
  });

  it('hands the session to the auth provider on success', async () => {
    const session = { accessToken: 't', expiresIn: 900, user: { id: 'u1' } };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(session)),
    );
    renderForm();

    await userEvent.type(screen.getByLabelText('Email'), 'maya@northstarcoffee.co');
    await userEvent.type(screen.getByLabelText('Password'), 'correct horse battery');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await vi.waitFor(() => expect(acceptSession).toHaveBeenCalled());
    expect(acceptSession.mock.calls[0]?.[0]).toEqual(session);
  });
});
