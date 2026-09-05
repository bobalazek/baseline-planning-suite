/**
 * Module Federation needs an async boundary before any shared module is touched, so the shared
 * scope is negotiated before React is resolved.
 */
// eslint-disable-next-line no-restricted-syntax -- Module Federation's required async boundary.
void import('./standalone');
