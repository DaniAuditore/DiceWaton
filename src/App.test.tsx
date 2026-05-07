// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from './App';

vi.mock('./routes/HostView', () => ({
  HostView: () => <div>Mock Host</div>,
}));

vi.mock('./routes/ControllerView', () => ({
  ControllerView: () => <div>Mock Controller</div>,
}));

describe('App routing resilience', () => {
  const setOnlineState = (online: boolean) => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: online,
    });
  };

  beforeEach(() => {
    cleanup();
    setOnlineState(true);
    window.history.pushState({}, '', '/');
  });

  it('renders accessible 404 with recovery CTA on unknown routes', () => {
    window.history.pushState({}, '', '/host/unknown');
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toBeTruthy();
  });

  it('recovers from 404 via return action', async () => {
    window.history.pushState({}, '', '/foo');
    render(<App />);

    fireEvent.click(screen.getAllByRole('link', { name: 'Volver al inicio' })[0]);

    expect(screen.getByRole('link', { name: 'Crear una sala' })).toBeTruthy();
  });

  it('renders offline shell guidance on deep links when network is unavailable', () => {
    setOnlineState(false);
    window.history.pushState({}, '', '/controller');

    render(<App />);

    expect(screen.getByRole('status').textContent).toContain('Sin conexión. Podés abrir DiceWaton en caché, pero salas, unión y tiradas en vivo requieren internet.');
    expect(screen.getByText('Mock Controller')).toBeTruthy();
  });

  it('shows offline-ready status when cached shell becomes available', () => {
    render(<App />);

    fireEvent(window, new CustomEvent('pwa:offline-ready'));

    expect(screen.getByRole('status').textContent).toContain('DiceWaton puede abrir sin conexión. Salas, unión y tiradas en vivo requieren internet.');
  });

  it('shows update action and applies it on click', () => {
    const applyUpdate = vi.fn();
    render(<App />);

    fireEvent(
      window,
      new CustomEvent('pwa:update-available', {
        detail: { applyUpdate },
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar app' }));

    expect(applyUpdate).toHaveBeenCalledOnce();
  });
});
