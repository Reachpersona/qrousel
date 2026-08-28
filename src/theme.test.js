import fs from 'fs';
import path from 'path';

// Every colour in this app has to exist twice - once for a light page, once for
// a dark one. That is only reviewable if the pairs live together, so this test
// enforces the rule mechanically: index.css defines the tokens, and no other
// stylesheet is allowed to name a colour of its own.
//
// The rule matters because the failure is silent. A `color: #333` added to a
// component looks fine while you are working in light mode and turns into grey
// on near-black for everyone else, and nothing in this repo can render a page
// to catch it.

const STYLE_DIR = path.join(__dirname);
const TOKEN_FILE = 'index.css';

const COLOUR_LITERAL = /(#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\()/g;

const stylesheets = () =>
  fs.readdirSync(STYLE_DIR).filter((name) => name.endsWith('.css'));

// Comments explain colours constantly; only declarations are the subject here.
const withoutComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('theme tokens', () => {
  it('finds the stylesheets', () => {
    expect(stylesheets().length).toBeGreaterThan(5);
    expect(stylesheets()).toContain(TOKEN_FILE);
  });

  it.each(
    fs
      .readdirSync(path.join(__dirname))
      .filter((name) => name.endsWith('.css') && name !== TOKEN_FILE)
  )('%s names no colour of its own', (name) => {
    const css = withoutComments(fs.readFileSync(path.join(STYLE_DIR, name), 'utf8'));
    const found = css.match(COLOUR_LITERAL) || [];

    expect(found).toEqual([]);
  });

  describe(TOKEN_FILE, () => {
    const css = () => fs.readFileSync(path.join(STYLE_DIR, TOKEN_FILE), 'utf8');

    const tokensIn = (block) => {
      const names = block.match(/--[a-z-]+(?=\s*:)/g) || [];
      return new Set(names);
    };

    const lightBlock = () => {
      const match = css().match(/:root,\s*\.theme-light\s*\{([\s\S]*?)\n\}/);
      return match ? match[1] : '';
    };

    const forcedDarkBlock = () => {
      const match = css().match(/\n\.theme-dark\s*\{([\s\S]*?)\n\}/);
      return match ? match[1] : '';
    };

    // Values, not just names: the risk with a duplicated set is that one side
    // gets tuned and the other does not.
    const valuesIn = (block) => {
      const pairs = block.match(/--[a-z-]+\s*:\s*[^;]+;/g) || [];
      return pairs
        .map((pair) => pair.replace(/\s+/g, ' ').trim())
        .sort()
        .join('\n');
    };

    const darkBlock = () => {
      const match = css().match(
        /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([\s\S]*?)\}/
      );
      return match ? match[1] : '';
    };

    it('declares a light value for every token', () => {
      expect(tokensIn(lightBlock()).size).toBeGreaterThan(5);
    });

    // The whole point. A token with only a light value is worse than no token:
    // it reads as themed and is not.
    it('declares a dark value for every light one', () => {
      const light = tokensIn(lightBlock());
      const dark = tokensIn(darkBlock());
      const missing = [...light].filter((token) => !dark.has(token));

      expect(missing).toEqual([]);
    });

    it('defines no dark token that has no light counterpart', () => {
      const light = tokensIn(lightBlock());
      const dark = tokensIn(darkBlock());
      const orphans = [...dark].filter((token) => !light.has(token));

      expect(orphans).toEqual([]);
    });

    // Pure black behind off-white causes halation - the glow that makes text
    // bleed. Every real dark theme backs off both ends.
    it('avoids the extremes a naive inversion would produce', () => {
      const dark = darkBlock();
      expect(dark).not.toMatch(/--surface\s*:\s*#000(000)?\b/);
      expect(dark).not.toMatch(/--text\s*:\s*#fff(fff)?\b/);
    });

    it('still declares color-scheme, which is what opts out of auto-darkening', () => {
      expect(css()).toMatch(/color-scheme:\s*light dark/);
    });

    // An entry that names its own background decides the lightness of its page,
    // so the dialogs and footer above it follow the page rather than the phone.
    // That needs the same two sets available as forcible classes.
    it('offers each scheme as a class that can be forced onto a subtree', () => {
      expect(css()).toMatch(/\.theme-light\s*\{/);
      expect(css()).toMatch(/\n\.theme-dark\s*\{/);
    });

    it('keeps the forced dark set identical to the dark scheme set', () => {
      expect(valuesIn(forcedDarkBlock())).toBe(valuesIn(darkBlock()));
      expect(valuesIn(forcedDarkBlock())).not.toBe('');
    });

    // A forced page also has to say which scheme it is, or the browser keeps
    // painting its buttons and scrollbars for the phone's setting.
    it('declares a scheme on each forced class', () => {
      expect(forcedDarkBlock()).toMatch(/color-scheme:\s*dark/);
      expect(css()).toMatch(/\.theme-light\s*\{\s*color-scheme:\s*light/);
    });
  });
});
