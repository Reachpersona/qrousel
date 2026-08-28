import {
  normalizeHex,
  relativeLuminance,
  textColorFor,
  canTintQr,
  BACKGROUND_PRESETS,
} from './background';

describe('normalizeHex', () => {
  it('accepts a six digit colour', () => {
    expect(normalizeHex('#1d3557')).toBe('#1d3557');
  });

  it('expands a three digit colour', () => {
    expect(normalizeHex('#abc')).toBe('#aabbcc');
  });

  it('lowercases, so two spellings of one colour compare equal', () => {
    expect(normalizeHex('#1D3557')).toBe('#1d3557');
  });

  it('tolerates surrounding whitespace from a hand-edited file', () => {
    expect(normalizeHex('  #1d3557 ')).toBe('#1d3557');
  });

  // Anything that is not a colour must come back null rather than reaching a
  // style attribute. The regex cannot match a semicolon, a quote or a bracket,
  // which is what makes a css value built from it safe.
  it.each([
    ['navy'],
    ['rgb(29, 53, 87)'],
    ['#12345'],
    ['#1234567'],
    ['#nothex'],
    ['1d3557'],
    ['#fff; background: url(evil)'],
    ['#fff") ; color: red; ("'],
    ['url(evil)'],
    [''],
    ['   '],
    [null],
    [undefined],
    [42],
    [{}],
  ])('rejects %p', (value) => {
    expect(normalizeHex(value)).toBeNull();
  });
});

describe('relativeLuminance', () => {
  it('is 1 for white and 0 for black', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
  });

  // Green contributes most to perceived brightness, blue least - a mid grey is
  // not the midpoint between a pure green and a pure blue.
  it('weights the channels the way an eye does', () => {
    expect(relativeLuminance('#00ff00')).toBeGreaterThan(relativeLuminance('#ff0000'));
    expect(relativeLuminance('#ff0000')).toBeGreaterThan(relativeLuminance('#0000ff'));
  });
});

describe('textColorFor', () => {
  it('puts dark text on a light background', () => {
    expect(textColorFor('#ffffff')).toBe('#111111');
    expect(textColorFor('#ffe8d6')).toBe('#111111');
  });

  it('puts light text on a dark background', () => {
    expect(textColorFor('#000000')).toBe('#ffffff');
    expect(textColorFor('#1d3557')).toBe('#ffffff');
  });

  // Black and white text contrast equally at a luminance of about 0.179, so the
  // choice has to flip across that value rather than at a naive 0.5.
  it('flips at the luminance where the two are equally readable', () => {
    // Adjacent greys, one step apart, either side of the crossover. Nothing
    // between them to hide a wrong threshold in.
    const justBelow = '#757575'; // luminance 0.17789
    const justAbove = '#767676'; // luminance 0.18116
    expect(relativeLuminance(justBelow)).toBeLessThan(0.1791);
    expect(relativeLuminance(justAbove)).toBeGreaterThan(0.1791);
    expect(textColorFor(justBelow)).toBe('#ffffff');
    expect(textColorFor(justAbove)).toBe('#111111');
  });

  it('has no opinion about a colour it does not understand', () => {
    expect(textColorFor('navy')).toBeNull();
    expect(textColorFor(null)).toBeNull();
  });
});

describe('canTintQr', () => {
  // Tinting recolours the quiet zone and light modules. It is only safe while
  // the result still contrasts hard against the black modules - a scanner
  // failing is worse than a white square looking a bit abrupt.
  it('allows a pale background', () => {
    expect(canTintQr('#ffffff')).toBe(true);
    expect(canTintQr('#ffe8d6')).toBe(true);
  });

  it('refuses a dark background, which would leave black on near-black', () => {
    expect(canTintQr('#1d3557')).toBe(false);
    expect(canTintQr('#000000')).toBe(false);
  });

  it('refuses a mid tone, where contrast is merely adequate for text', () => {
    // Readable behind text, nowhere near the margin a camera wants.
    expect(canTintQr('#8a8a8a')).toBe(false);
  });

  // Adjacent greys either side of the threshold, so a moved threshold cannot
  // slip through between two comfortable examples.
  it('draws the line between two greys one step apart', () => {
    expect(relativeLuminance('#bbbbbb')).toBeLessThan(0.5); // 0.49693
    expect(relativeLuminance('#bcbcbc')).toBeGreaterThan(0.5); // 0.50289
    expect(canTintQr('#bbbbbb')).toBe(false);
    expect(canTintQr('#bcbcbc')).toBe(true);
  });

  it('refuses anything it cannot measure', () => {
    expect(canTintQr('navy')).toBe(false);
    expect(canTintQr(null)).toBe(false);
  });
});

describe('BACKGROUND_PRESETS', () => {
  it('offers a handful of choices', () => {
    expect(BACKGROUND_PRESETS.length).toBeGreaterThanOrEqual(5);
  });

  it('are all valid colours', () => {
    BACKGROUND_PRESETS.forEach((preset) => {
      expect(normalizeHex(preset.value)).toBe(preset.value);
    });
  });

  // The one-tap path should never produce the abrupt white square. Anything
  // dark is still reachable through the custom picker.
  it('are all light enough for the QR code to blend into', () => {
    BACKGROUND_PRESETS.forEach((preset) => {
      expect(canTintQr(preset.value)).toBe(true);
    });
  });

  it('each carry a name, for the button label', () => {
    BACKGROUND_PRESETS.forEach((preset) => {
      expect(typeof preset.name).toBe('string');
      expect(preset.name.length).toBeGreaterThan(0);
    });
  });
});
