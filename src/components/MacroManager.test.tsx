// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
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
  const addMacro = vi.fn();
  const updateMacro = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMacroStore.mockReturnValue({
      macros: [{ id: 'macro-1', user_id: 'user-1', name: 'Bola de fuego', dice_expression: '2d6+1' }],
      fetchMacros: vi.fn(),
      addMacro,
      updateMacro,
      deleteMacro: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
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

  it('keeps invalid add input and shows actionable inline feedback before save', async () => {
    render(<MacroManager onRoll={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Nombre del nuevo macro'), { target: { value: 'Ataque' } });
    fireEvent.change(screen.getByLabelText('Expresión del nuevo macro'), { target: { value: '2d6+' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));

    expect((await screen.findByRole('alert')).textContent).toContain('No entendimos');
    expect((screen.getByLabelText('Expresión del nuevo macro') as HTMLInputElement).value).toBe('2d6+');
    expect(addMacro).not.toHaveBeenCalled();
    expect(mockSetStatus).toHaveBeenCalledWith('macro-crud', 'error', expect.stringContaining('No entendimos'));
  });

  it('validates edit input before updating and keeps the edited value visible', async () => {
    render(<MacroManager onRoll={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.change(screen.getByLabelText('Expresión del macro'), { target: { value: '0d6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect((await screen.findByRole('alert')).textContent).toContain('cantidad de dados debe ser mayor a 0');
    expect((screen.getByLabelText('Expresión del macro') as HTMLInputElement).value).toBe('0d6');
    expect(updateMacro).not.toHaveBeenCalled();
  });

  it('blocks invalid saved macro rolls before calling onRoll', async () => {
    mockUseMacroStore.mockReturnValue({
      macros: [{ id: 'macro-legacy', user_id: 'user-1', name: 'Legacy', dice_expression: 'abc' }],
      fetchMacros: vi.fn(),
      addMacro,
      updateMacro,
      deleteMacro: vi.fn(),
    });
    const onRoll = vi.fn();

    render(<MacroManager onRoll={onRoll} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tirar' }));

    expect((await screen.findByRole('alert')).textContent).toContain('No se tiró "Legacy"');
    expect(onRoll).not.toHaveBeenCalled();
    expect(mockSetStatus).toHaveBeenCalledWith('macro-roll', 'error', expect.stringContaining('No se tiró "Legacy"'));
  });
});
