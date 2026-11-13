import test from 'node:test';
import assert from 'node:assert/strict';
import { themes, resolveTheme, themeTokens } from '../public/themes.js';

test('faction preferences accept stable ids and reject invalid or legacy indexes', () => {
  assert.equal(themes.length, 23);
  assert.equal(new Set(themes.map(theme => theme.id)).size, 23);
  for (const input of [undefined, null, '', 3, -1, NaN, {}, '999', 'unknown']) {
    assert.equal(resolveTheme(input).id, 'orokin');
  }
  for (const theme of themes) {
    assert.equal(resolveTheme(theme.id), theme);
    assert.ok(theme.motto && theme.mottoEn && theme.name && theme.en);
    for (const token of Object.values(themeTokens(theme))) assert.match(token, /^#[0-9a-f]{6}$/i);
  }
});

test('faction identity selects its own light or dark surfaces with readable text', () => {
  const luminance = hex => {
    const linear = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255)
      .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
  };
  const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
  assert.equal(resolveTheme('red-veil').dark, true);
  assert.equal(resolveTheme('nightwave').dark, true);
  assert.equal(resolveTheme('new-loka').dark, false);
  for (const theme of themes) {
    const tokens = themeTokens(theme);
    for (const surface of [tokens.bg, tokens.panel]) {
      for (const ink of [tokens.ink, tokens.muted, tokens.mint]) {
        assert.ok(contrast(surface, ink) >= 4.5, `${theme.id}: ${ink} on ${surface}`);
      }
    }
  }
});
