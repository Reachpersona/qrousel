import { cappedDescriptionHeight } from './ContactCarousel';

describe('cappedDescriptionHeight', () => {
  it('leaves a description that already fits alone', () => {
    expect(cappedDescriptionHeight(80, 800)).toBe(80);
  });

  it('caps a tall description to a quarter of the viewport', () => {
    // Otherwise the reserved space pushes the controls and footer off screen,
    // and a min-height cannot be reined in by max-height in CSS.
    expect(cappedDescriptionHeight(600, 800)).toBe(200);
  });

  it('never reserves negative space', () => {
    expect(cappedDescriptionHeight(-50, 800)).toBe(0);
  });

  it('keeps the measurement when the viewport height is unknown', () => {
    expect(cappedDescriptionHeight(120, 0)).toBe(120);
    expect(cappedDescriptionHeight(120, undefined)).toBe(120);
  });
});
