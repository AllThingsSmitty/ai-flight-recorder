/**
 * Node.js-only exports for @flight-recorder/sdk.
 *
 * Import from this subpath to avoid pulling Node.js built-ins into browser bundles:
 *   import { FileTransport } from "@flight-recorder/sdk/node";
 */
export * from "./transports/FileTransport";
