/**
 * Node.js-only exports for @ai-flight-recorder/sdk.
 *
 * Import from this subpath to avoid pulling Node.js built-ins into browser bundles:
 *   import { FileTransport } from "@ai-flight-recorder/sdk/node";
 */
export * from "./transports/FileTransport";
