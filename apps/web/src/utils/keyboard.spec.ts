import { describe, expect, it } from 'vitest';
import { isImeComposing } from './keyboard';

describe('isImeComposing', () => {
  it('detects composition sessions that expose the standard flag', () => {
    expect(isImeComposing(new KeyboardEvent('keydown', { isComposing: true }))).toBe(true);
  });

  it('detects the legacy keyCode used by some Chinese input methods', () => {
    const event = new KeyboardEvent('keydown');

    Object.defineProperty(event, 'keyCode', {
      value: 229,
    });

    expect(isImeComposing(event)).toBe(true);
  });

  it('allows a normal Enter key after composition has ended', () => {
    expect(isImeComposing(new KeyboardEvent('keydown', { key: 'Enter' }))).toBe(false);
  });
});
