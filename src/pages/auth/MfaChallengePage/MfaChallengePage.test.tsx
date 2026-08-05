import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MfaChallengePage } from './MfaChallengePage';

const navigate = vi.fn();
const verify = vi.fn();
const completeMfaChallenge = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
    useLocation: () => ({ state: { mfaToken: 'mfa-token' }, pathname: '/login/mfa' }),
  };
});

vi.mock('@/hooks', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/hooks');
  return {
    ...actual,
    useAuth: () => ({ completeMfaChallenge }),
    useMfaChallenge: () => ({
      verify,
      recover: vi.fn(),
      // The mutation's own flag only covers the code check. It is false while
      // the account loads, which is the window this page must still cover.
      isVerifying: false,
      isRecovering: false,
      verifyError: null,
      recoverError: null,
    }),
  };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <MfaChallengePage />
    </MemoryRouter>,
  );
}

function enterCode(code: string) {
  const inputs = screen.getAllByRole('textbox');
  code.split('').forEach((digit, index) => {
    const input = inputs[index];
    if (input) fireEvent.change(input, { target: { value: digit } });
  });
}

beforeEach(() => {
  navigate.mockReset();
  verify.mockReset();
  completeMfaChallenge.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('MfaChallengePage sign-in feedback', () => {
  // Verifying the code and loading the account are two round trips. The
  // account call has been measured at several seconds, so the form must stay
  // busy across both rather than going idle in between.
  it('stays busy while the account loads after the code is accepted', async () => {
    verify.mockResolvedValue({ user: { role: 'admin' }, token: 'jwt' });

    let releaseAccountLoad: (() => void) | undefined;
    completeMfaChallenge.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          releaseAccountLoad = resolve;
        }),
    );

    renderPage();
    enterCode('183664');

    await waitFor(() => expect(verify).toHaveBeenCalled());

    // Code accepted, account still loading — the button must not read "Verify"
    // again, and must not be clickable.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Signing you in/i })).toBeDisabled();
    });
    expect(screen.queryByRole('button', { name: /^Verify$/ })).not.toBeInTheDocument();

    releaseAccountLoad?.();
    await waitFor(() => expect(navigate).toHaveBeenCalled());
  });

  // A one-time code cannot be spent twice; a second submit would fail and show
  // an error on a sign-in that is actually succeeding.
  it('does not let the code be submitted twice', async () => {
    verify.mockResolvedValue({ user: { role: 'admin' }, token: 'jwt' });
    completeMfaChallenge.mockImplementation(() => new Promise<void>(() => {}));

    renderPage();
    enterCode('183664');

    await waitFor(() => expect(verify).toHaveBeenCalledTimes(1));

    const button = await screen.findByRole('button', { name: /Signing you in/i });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(verify).toHaveBeenCalledTimes(1);
  });

  it('lets the user try again when the code is wrong', async () => {
    verify.mockRejectedValue(new Error('Invalid code'));

    renderPage();
    enterCode('000000');

    await waitFor(() => expect(screen.getByText('Invalid code')).toBeInTheDocument());
    // Released on failure so a correct code can be entered.
    expect(screen.getByRole('button', { name: /^Verify$/ })).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalledWith(expect.stringContaining('dashboard'), expect.anything());
  });
});
