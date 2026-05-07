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
  beforeEach(() => {
    cleanup();
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

    expect(screen.getByRole('link', { name: 'Host a Game' })).toBeTruthy();
  });
});
