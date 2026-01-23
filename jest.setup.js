import '@testing-library/jest-dom';

// Web API Polyfills for Next.js API routes testing
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// ReadableStream polyfill is required for undici
if (typeof ReadableStream === 'undefined') {
  const { ReadableStream, TransformStream, WritableStream } = require('stream/web');
  global.ReadableStream = ReadableStream;
  global.TransformStream = TransformStream;
  global.WritableStream = WritableStream;
}

// Mock Request and Response from undici (used by Next.js)
try {
  const { Request, Response, Headers, FormData } = require('undici');
  global.Request = Request;
  global.Response = Response;
  global.Headers = Headers;
  global.FormData = FormData;
} catch {
  // If undici fails to load, continue without polyfills
  // This is fine for unit tests that don't need Request/Response
}
