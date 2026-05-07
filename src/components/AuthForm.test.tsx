// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthForm } from './AuthForm';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
    },
  },
}));

describe('AuthForm join expectation copy', () => {
  it('explains sign-in before joining and provides a home path', () => {
    render(
      <MemoryRouter>
        <AuthForm intendedPin="ABCD" />
      </MemoryRouter>,
    );

    expect(screen.getByText('Ingresá para unirte a una sala')).toBeTruthy();
    expect(screen.getByText('Después de ingresar vas a poder unirte con el PIN ABCD.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toBeTruthy();
  });
});
