// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { useUiStore } from '../../stores/useUiStore';
import { ScopedStatus } from './ScopedStatus';

describe('ScopedStatus', () => {
  beforeEach(() => {
    cleanup();
    useUiStore.setState({ statusByScope: {}, messageByScope: {} });
  });

  it('renders scoped success feedback as a status region', () => {
    useUiStore.getState().setStatus('room-pin', 'success', 'PIN copiado');

    render(<ScopedStatus scope="room-pin" />);

    expect(screen.getByRole('status').textContent).toContain('PIN copiado');
    expect(screen.getByText('Estado: listo')).toBeTruthy();
  });

  it('renders scoped errors as alerts', () => {
    useUiStore.getState().setStatus('controller-join', 'error', 'Necesitás iniciar sesión');

    render(<ScopedStatus scope="controller-join" />);

    expect(screen.getByRole('alert').textContent).toContain('Necesitás iniciar sesión');
  });

  it('auto-clears temporary success feedback', () => {
    vi.useFakeTimers();
    useUiStore.getState().setStatus('room-pin', 'success', 'PIN copiado');

    render(<ScopedStatus scope="room-pin" />);

    expect(screen.getAllByRole('status')[0].textContent).toContain('PIN copiado');

    vi.advanceTimersByTime(3000);

    expect(useUiStore.getState().getScopedStatus('room-pin')).toBeNull();
    vi.useRealTimers();
  });
});
