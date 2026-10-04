import { fireEvent, render, screen } from '@testing-library/react';
import { CommandPaletteProvider } from './command-palette';

const push = vi.fn();
const workspace = {
  current: { id: 'ws-1', name: 'Northstar Coffee' },
  workspaces: [
    { id: 'ws-1', name: 'Northstar Coffee' },
    { id: 'ws-2', name: 'Lantern Books' },
  ],
  switchTo: vi.fn(),
  can: (permission: string) => permission !== 'audit.read',
};

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/auth/auth-provider', () => ({ useAuth: () => ({ signOut: vi.fn() }) }));
vi.mock('@/lib/workspace/workspace-provider', () => ({
  CREATE_WORKSPACE_PATH: '/onboarding/workspace',
  useWorkspace: () => workspace,
}));

// cmdk measures and scrolls items; jsdom has neither.
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= () => {};
});

function openPalette() {
  render(
    <CommandPaletteProvider>
      <p>page</p>
    </CommandPaletteProvider>,
  );
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
}

describe('CommandPalette', () => {
  it('opens with Ctrl+K and lists pages and other workspaces', () => {
    openPalette();

    expect(screen.getByPlaceholderText('Where to?')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Switch to Lantern Books/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Switch to Northstar/ })).not.toBeInTheDocument();
  });

  it('hides destinations the role cannot open', () => {
    openPalette();

    expect(screen.getByRole('option', { name: /Members/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Audit log/ })).not.toBeInTheDocument();
  });

  it('navigates and closes when an item is chosen', () => {
    openPalette();

    fireEvent.click(screen.getByRole('option', { name: /^Roles/ }));

    expect(push).toHaveBeenCalledWith('/settings/roles');
    expect(screen.queryByPlaceholderText('Where to?')).not.toBeInTheDocument();
  });
});
