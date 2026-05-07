// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DiceTray } from './DiceTray';

describe('DiceTray failure feedback', () => {
  afterEach(() => cleanup());

  it('shows connection guidance when rolling is disabled', () => {
    render(<DiceTray onRoll={vi.fn()} disabled disabledMessage="Esperá la conexión." />);

    expect(screen.getByRole('status').textContent).toContain('Esperá la conexión.');
    expect(screen.getByRole('button', { name: 'd20' }).hasAttribute('disabled')).toBe(true);
  });

  it('shows visible retry feedback when a dice roll cannot be sent', async () => {
    const onRoll = vi.fn().mockRejectedValueOnce(new Error('send failed')).mockResolvedValueOnce(undefined);

    render(<DiceTray onRoll={onRoll} />);

    fireEvent.click(screen.getByRole('button', { name: 'd20' }));

    expect((await screen.findByRole('alert')).textContent).toContain('No pudimos registrar la tirada');

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => {
      expect(onRoll).toHaveBeenCalledTimes(2);
    });
  });
});
