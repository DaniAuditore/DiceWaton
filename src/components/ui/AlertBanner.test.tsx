// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AlertBanner } from './AlertBanner';

describe('AlertBanner', () => {
  it('renders alert role for errors', () => {
    render(<AlertBanner tone="error" message="falló" />);
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
