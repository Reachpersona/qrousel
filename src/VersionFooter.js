import React from 'react';
import './VersionFooter.css';

/**
 * Identifies the running build. Read at render rather than at module load so a
 * test can set the environment around it, and so a missing value degrades to
 * "dev" instead of printing undefined at the user.
 *
 * The app has no service worker, so a redeploy reaches people on their next
 * load; this footer is how you confirm which build you are actually looking at.
 */
function VersionFooter() {
  const version = process.env.REACT_APP_VERSION || 'dev';
  const builtAt = process.env.REACT_APP_BUILD_TIME;

  return (
    <p className="version-footer" data-testid="version-footer">
      v{version}
      {builtAt ? ` · built ${builtAt}` : ''}
    </p>
  );
}

export default VersionFooter;
