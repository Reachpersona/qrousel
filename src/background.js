// A per-entry page colour. Colours come from a user-supplied YAML file and end
// up in a style attribute, so this module is the only place a value is allowed
// to become a colour - everything else asks it.

// Hex only. Not for safety alone: a colour has to be measurable to pick a
// readable text colour against it, and `navy` cannot be measured without
// shipping a name table. The editor offers a picker, so nobody types this.
//
// The shape is also what makes the value safe to interpolate into CSS - it
// admits no semicolon, quote, bracket or space, so there is nothing to break
// out of a declaration with.
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * The canonical form of a colour - lowercase, six digits - or null if the value
 * is not one. Null is the single answer for "no colour here", whether the key
 * was absent, empty, or something hand-typed that this does not understand.
 */
export function normalizeHex(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (!HEX.test(trimmed)) return null;
  if (trimmed.length === 4) {
    return '#' + trimmed.slice(1).split('').map((c) => c + c).join('');
  }
  return trimmed;
}

function channels(hex) {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  return [1, 3, 5].map((start) => parseInt(normalized.slice(start, start + 2), 16) / 255);
}

/**
 * Relative luminance, per WCAG 2. Not the average of the channels: the eye is
 * far more sensitive to green than to blue, and sRGB values are gamma-encoded,
 * so both have to be undone before the channels can be weighed against each
 * other.
 */
export function relativeLuminance(hex) {
  const parts = channels(hex);
  if (!parts) return null;
  const [r, g, b] = parts.map((c) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Where black text and white text contrast equally against a background:
// (L + 0.05) / 0.05 == 1.05 / (L + 0.05). Not 0.5 - a mid grey is already dark
// enough that white wins.
const TEXT_FLIP_LUMINANCE = Math.sqrt(1.05 * 0.05) - 0.05;

// The QR code's quiet zone and light modules can take the page colour, but only
// while that colour still contrasts hard against the black modules. 0.5 keeps
// the ratio above 11:1 - far beyond what text needs, because a camera reading
// at an angle in poor light has much less to work with than an eye does.
const QR_TINT_MIN_LUMINANCE = 0.5;

/**
 * Whether a page painted this colour is a light one, or null if the colour is
 * not one this understands. Drives both the text colour and which set of theme
 * tokens the page and everything floating above it should use - they have to
 * agree, so they share this answer rather than each deciding.
 */
export function isLightBackground(hex) {
  const luminance = relativeLuminance(hex);
  if (luminance === null) return null;
  return luminance > TEXT_FLIP_LUMINANCE;
}

/**
 * The text colour to use on a background, or null if the background is not a
 * colour this understands - in which case the caller should style nothing at
 * all rather than guess.
 */
export function textColorFor(hex) {
  const light = isLightBackground(hex);
  if (light === null) return null;
  return light ? '#111111' : '#ffffff';
}

/**
 * Whether a QR code may be generated with this colour behind it instead of
 * white. False for anything unmeasurable, so the safe branch is also the
 * default.
 */
export function canTintQr(hex) {
  const luminance = relativeLuminance(hex);
  if (luminance === null) return false;
  return luminance >= QR_TINT_MIN_LUMINANCE;
}

// One tap covers the common case; the picker is there for everything else.
// Every one of these is light enough to tint the QR code, so the quick path
// never produces a white square the user did not ask for.
export const BACKGROUND_PRESETS = [
  { name: 'Paper', value: '#fdf6e3' },
  { name: 'Blush', value: '#ffe8e8' },
  { name: 'Peach', value: '#ffe8d6' },
  { name: 'Mint', value: '#e0f2e9' },
  { name: 'Sky', value: '#e3f2fd' },
  { name: 'Lilac', value: '#ede7f6' },
  { name: 'Slate', value: '#e8eaed' },
];
