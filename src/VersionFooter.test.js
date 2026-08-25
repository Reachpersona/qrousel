import React from 'react';
import { render, screen } from '@testing-library/react';
import VersionFooter from './VersionFooter';

describe('VersionFooter', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env.REACT_APP_VERSION = original.REACT_APP_VERSION;
    process.env.REACT_APP_BUILD_TIME = original.REACT_APP_BUILD_TIME;
  });

  it('shows the version the app was built with', () => {
    process.env.REACT_APP_VERSION = '1.2.3';
    delete process.env.REACT_APP_BUILD_TIME;

    render(<VersionFooter />);

    expect(screen.getByTestId('version-footer')).toHaveTextContent('v1.2.3');
  });

  it('shows the build time alongside the version when it is known', () => {
    process.env.REACT_APP_VERSION = '1.2.3';
    process.env.REACT_APP_BUILD_TIME = '2026-08-25T14:32Z';

    render(<VersionFooter />);

    expect(screen.getByTestId('version-footer')).toHaveTextContent('2026-08-25T14:32Z');
  });

  it('shows no build time when it was not recorded', () => {
    process.env.REACT_APP_VERSION = '1.2.3';
    delete process.env.REACT_APP_BUILD_TIME;

    render(<VersionFooter />);

    expect(screen.getByTestId('version-footer')).toHaveTextContent('v1.2.3');
    expect(screen.getByTestId('version-footer').textContent).not.toMatch(/·|undefined/);
  });

  it('says dev rather than undefined when no version was injected', () => {
    delete process.env.REACT_APP_VERSION;
    delete process.env.REACT_APP_BUILD_TIME;

    render(<VersionFooter />);

    expect(screen.getByTestId('version-footer')).toHaveTextContent('vdev');
  });
});
