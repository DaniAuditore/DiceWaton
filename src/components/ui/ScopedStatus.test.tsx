// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { useUiStore } from '../../stores/useUiStore';
import { ScopedStatus } from './ScopedStatus';

describe('ScopedStatus', () => {
  beforeEach(() => {
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
});
