// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MacroManager } from './MacroManager';

const mockUseMacroStore = vi.fn();
const mockSetStatus = vi.fn();

vi.mock('../stores/useMacroStore', () => ({
  useMacroStore: () => mockUseMacroStore(),
}));

vi.mock('../stores/useUiStore', () => ({
  useUiStore: (selector: (state: { setStatus: typeof mockSetStatus }) => unknown) =>
    selector({ setStatus: mockSetStatus }),
}));

describe('MacroManager failure feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMacroStore.mockReturnValue({
      macros: [{ id: 'macro-1', user_id: 'user-1', name: 'Bola de fuego', dice_expression: '2d6+1' }],
      fetchMacros: vi.fn(),
      addMacro: vi.fn(),
      updateMacro: vi.fn(),
      deleteMacro: vi.fn(),
    });
  });

  it('shows visible retry feedback when a macro roll fails', async () => {
    const onRoll = vi.fn().mockRejectedValueOnce(new Error('send failed')).mockResolvedValueOnce(undefined);

    render(<MacroManager onRoll={onRoll} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tirar' }));

    expect((await screen.findByRole('alert')).textContent).toContain('No pudimos ejecutar el macro');

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => {
      expect(onRoll).toHaveBeenCalledTimes(2);
    });
  });
});
