import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CreateClientModal } from './CreateClientModal';

const createDormantClient = vi.fn();

vi.mock('@/services', () => ({
  createDormantClient: (...args: unknown[]) => createDormantClient(...args),
}));

const CREATED = {
  id: '7f1c0f6e-0000-4000-8000-000000000001',
  firstName: 'Amaka',
  lastName: 'Okonkwo',
  phone: '+2348000000000',
  shippingMark: 'GX-AMAKA',
  isActive: false as const,
  createdAt: '2026-08-05T10:00:00.000Z',
};

function fill(label: RegExp | string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: /Create & select/i }));
}

beforeEach(() => {
  createDormantClient.mockReset();
  createDormantClient.mockResolvedValue(CREATED);
  sessionStorage.setItem('globalxpress_token', 'staff-token');
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe('CreateClientModal', () => {
  it('requires a phone number and a shipping mark', async () => {
    render(<CreateClientModal onCreated={vi.fn()} onClose={vi.fn()} />);

    submit();
    await waitFor(() => expect(screen.getByText(/Phone number is required/i)).toBeInTheDocument());
    expect(createDormantClient).not.toHaveBeenCalled();

    fill(/Phone/, '+2348000000000');
    submit();
    await waitFor(() =>
      expect(screen.getByText(/Shipping mark is required/i)).toBeInTheDocument(),
    );
    expect(createDormantClient).not.toHaveBeenCalled();
  });

  // The endpoint accepts an email and the client search offers name or email,
  // so a client created without one is findable by name only.
  it('sends an email when given one', async () => {
    const onCreated = vi.fn();
    render(<CreateClientModal onCreated={onCreated} onClose={vi.fn()} />);

    fill(/Phone/, '+2348000000000');
    fill(/Shipping mark/, 'GX-AMAKA');
    fill(/Email/, 'amaka@example.com');
    submit();

    await waitFor(() => expect(createDormantClient).toHaveBeenCalled());
    const payload = createDormantClient.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload.email).toBe('amaka@example.com');
    expect(onCreated).toHaveBeenCalledWith(CREATED);
  });

  it('omits the email rather than sending an empty one', async () => {
    render(<CreateClientModal onCreated={vi.fn()} onClose={vi.fn()} />);

    fill(/Phone/, '+2348000000000');
    fill(/Shipping mark/, 'GX-AMAKA');
    submit();

    await waitFor(() => expect(createDormantClient).toHaveBeenCalled());
    const payload = createDormantClient.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload.email).toBeUndefined();
  });

  // Caught here so a typo comes back instantly instead of as a 400.
  it('rejects a malformed email before calling the API', async () => {
    render(<CreateClientModal onCreated={vi.fn()} onClose={vi.fn()} />);

    fill(/Phone/, '+2348000000000');
    fill(/Shipping mark/, 'GX-AMAKA');
    fill(/Email/, 'not-an-email');
    submit();

    await waitFor(() => expect(screen.getByText(/valid email address/i)).toBeInTheDocument());
    expect(createDormantClient).not.toHaveBeenCalled();
  });
});
