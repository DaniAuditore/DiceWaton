// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TextInput } from './TextInput';

describe('TextInput', () => {
  it('sets aria-invalid when invalid', () => {
    render(<TextInput invalid data-testid="input" />);
    expect(screen.getByTestId('input').getAttribute('aria-invalid')).toBe('true');
  });
});
