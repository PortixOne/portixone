export const DEFAULT_RUNTIME_PORT = 17321;
export const DEFAULT_RUNTIME_HOST = '127.0.0.1';
export const DEFAULT_CONFIG_FILENAME = 'config.json';
export const DEFAULT_NETWORK_PRINTER_PORT = 9100;

/**
 * The installed product version — must be kept in sync by hand with
 * installer/portixone.iss's MyAppVersion. Used for update checks, distinct
 * from PROTOCOL_VERSION (the wire contract) and each package's own
 * package.json version.
 */
export const APP_VERSION = '0.1.0';
