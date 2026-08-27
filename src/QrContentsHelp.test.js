import React from 'react';
import { render, screen } from '@testing-library/react';
import QrContentsHelp from './QrContentsHelp';

describe('QrContentsHelp', () => {
  const show = () => render(<QrContentsHelp onClose={() => {}} />);

  const body = () => document.querySelector('.payload-help');

  it.each([
    ['a web address', /https:\/\/example\.com/],
    ['a phone number', /\+15551234567/],
    ['an email', /mailto:/],
    ['a text message', /sms:\+15551234567/],
  ])('shows an example of %s', (_what, example) => {
    show();

    expect(body()).toHaveTextContent(example);
  });

  // Some scanners hand a tel: URI to the dialer without stripping the scheme,
  // so the number arrives mangled. The plain number works everywhere, and the
  // app offers Call for it either way - so that is what the help leads with.
  it('leads with the plain number rather than tel:', () => {
    show();

    const phone = Array.from(body().querySelectorAll('dt')).find((dt) =>
      /phone number/i.test(dt.textContent)
    );
    const example = phone.nextElementSibling.querySelector('code');
    expect(example).toHaveTextContent('+15551234567');
    expect(example).not.toHaveTextContent(/tel:/);
  });

  it('warns that some scanners mishandle tel:', () => {
    show();

    expect(body()).toHaveTextContent(/some (phone )?scanners/i);
  });

  // geo: is not offered, so the help must not teach it.
  it('gives a map example that works on every phone', () => {
    show();

    expect(body()).toHaveTextContent(/maps\.google\.com\/\?q=/);
    expect(body()).not.toHaveTextContent(/geo:/);
  });

  it('gives the https form of a WhatsApp link, not the app scheme', () => {
    show();

    expect(body()).toHaveTextContent(/wa\.me\//);
    expect(body()).not.toHaveTextContent(/whatsapp:/);
  });

  // There is no single sms: string that prefills on both platforms, and a
  // reader who does not know that will write one and test it on one phone.
  it('warns that a prefilled text message differs between android and iphone', () => {
    show();

    const text = body().textContent;
    expect(text).toMatch(/Android/i);
    expect(text).toMatch(/iPhone/i);
    expect(text).toMatch(/\?body=/);
    expect(text).toMatch(/&body=/);
  });

  it('says how to write a space and a line break', () => {
    show();

    expect(body()).toHaveTextContent(/%20/);
    expect(body()).toHaveTextContent(/%0A/);
  });

  it('says what happens to a payload that is not one of these', () => {
    show();

    expect(body()).toHaveTextContent(/shown as text/i);
  });

  it('closes when asked', () => {
    const onClose = jest.fn();
    render(<QrContentsHelp onClose={onClose} />);

    screen.getByRole('button', { name: /close/i }).click();

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
