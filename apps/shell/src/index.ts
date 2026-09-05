/**
 * Module Federation needs an async boundary before any shared module is touched, so that the
 * shared scope is negotiated before React is resolved. This one-line file is that boundary, and is
 * the only place in the repo that imports a first-party module dynamically.
 */
// eslint-disable-next-line no-restricted-syntax -- Module Federation's required async boundary.
void import('./bootstrap');
