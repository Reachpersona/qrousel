import React from 'react';
import { render, screen } from '@testing-library/react';
import HelpDialog, { appAddress } from './HelpDialog';

describe('appAddress', () => {
  it('names the host and path the app was served from', () => {
    expect(appAddress({ host: 'weberon.github.io', pathname: '/qrousel/' })).toBe(
      'weberon.github.io/qrousel/'
    );
  });

  it('distinguishes the two deployments', () => {
    expect(appAddress({ host: 'reachpersona.github.io', pathname: '/qrousel/' })).not.toBe(
      appAddress({ host: 'weberon.github.io', pathname: '/qrousel/' })
    );
  });

  it('falls back to the root when there is no path', () => {
    expect(appAddress({ host: 'example.com' })).toBe('example.com/');
  });

  it('reports nothing when there is no host to report', () => {
    // A file:// URL has no host; a bare hostless line would say nothing useful.
    expect(appAddress({ host: '', pathname: '/x' })).toBeNull();
    expect(appAddress(null)).toBeNull();
  });
});

describe('HelpDialog', () => {
  it('shows which deployment is being viewed', () => {
    render(<HelpDialog onClose={() => {}} />);

    expect(screen.getByTestId('help-address')).toHaveTextContent('Installed from localhost/');
  });
});
