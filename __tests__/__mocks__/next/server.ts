// next/server モック

// Mock Headers class
class MockHeaders {
  private headers: Map<string, string> = new Map();

  constructor(init?: HeadersInit) {
    if (init) {
      if (init instanceof MockHeaders) {
        init.forEach((value, key) => this.headers.set(key, value));
      } else if (Array.isArray(init)) {
        init.forEach(([key, value]) => this.headers.set(key.toLowerCase(), value));
      } else if (typeof init === 'object') {
        Object.entries(init).forEach(([key, value]) =>
          this.headers.set(key.toLowerCase(), value)
        );
      }
    }
  }

  get(name: string): string | null {
    return this.headers.get(name.toLowerCase()) ?? null;
  }

  set(name: string, value: string): void {
    this.headers.set(name.toLowerCase(), value);
  }

  has(name: string): boolean {
    return this.headers.has(name.toLowerCase());
  }

  delete(name: string): void {
    this.headers.delete(name.toLowerCase());
  }

  forEach(callback: (value: string, key: string) => void): void {
    this.headers.forEach(callback);
  }

  entries(): IterableIterator<[string, string]> {
    return this.headers.entries();
  }

  keys(): IterableIterator<string> {
    return this.headers.keys();
  }

  values(): IterableIterator<string> {
    return this.headers.values();
  }
}

// Mock URL for NextRequest
class MockURL {
  href: string;
  origin: string;
  protocol: string;
  host: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  searchParams: URLSearchParams;
  hash: string;

  constructor(url: string, base?: string) {
    const fullUrl = base ? new URL(url, base).href : url;
    const parsed = new URL(fullUrl);

    this.href = parsed.href;
    this.origin = parsed.origin;
    this.protocol = parsed.protocol;
    this.host = parsed.host;
    this.hostname = parsed.hostname;
    this.port = parsed.port;
    this.pathname = parsed.pathname;
    this.search = parsed.search;
    this.searchParams = parsed.searchParams;
    this.hash = parsed.hash;
  }

  toString(): string {
    return this.href;
  }
}

// Mock NextRequest
export class NextRequest {
  private _url: MockURL;
  private _method: string;
  private _headers: MockHeaders;
  private _body: string | null;
  private _bodyUsed: boolean = false;

  constructor(input: string | URL | Request, init?: RequestInit) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    this._url = new MockURL(url);
    this._method = init?.method || 'GET';
    this._headers = new MockHeaders(init?.headers as HeadersInit);
    this._body = init?.body ? String(init.body) : null;
  }

  get url(): string {
    return this._url.href;
  }

  get method(): string {
    return this._method;
  }

  get headers(): MockHeaders {
    return this._headers;
  }

  get nextUrl(): MockURL {
    return this._url;
  }

  get bodyUsed(): boolean {
    return this._bodyUsed;
  }

  async json(): Promise<unknown> {
    this._bodyUsed = true;
    if (!this._body) return null;
    return JSON.parse(this._body);
  }

  async text(): Promise<string> {
    this._bodyUsed = true;
    return this._body || '';
  }

  clone(): NextRequest {
    return new NextRequest(this._url.href, {
      method: this._method,
      headers: Object.fromEntries(this._headers.entries()),
      body: this._body || undefined,
    });
  }
}

// Mock NextResponse
export class NextResponse {
  private _body: unknown;
  private _status: number;
  private _headers: MockHeaders;

  constructor(body?: BodyInit | null, init?: ResponseInit) {
    this._body = body;
    this._status = init?.status || 200;
    this._headers = new MockHeaders(init?.headers as HeadersInit);
  }

  get status(): number {
    return this._status;
  }

  get ok(): boolean {
    return this._status >= 200 && this._status < 300;
  }

  get headers(): MockHeaders {
    return this._headers;
  }

  async json(): Promise<unknown> {
    if (typeof this._body === 'string') {
      return JSON.parse(this._body);
    }
    return this._body;
  }

  async text(): Promise<string> {
    if (typeof this._body === 'string') {
      return this._body;
    }
    return JSON.stringify(this._body);
  }

  static json(data: unknown, init?: ResponseInit): NextResponse {
    const response = new NextResponse(JSON.stringify(data), init);
    response._body = data;
    return response;
  }

  static redirect(url: string | URL, status?: number): NextResponse {
    return new NextResponse(null, {
      status: status || 307,
      headers: { Location: url.toString() },
    });
  }

  static rewrite(url: string | URL): NextResponse {
    return new NextResponse(null, {
      headers: { 'x-middleware-rewrite': url.toString() },
    });
  }

  static next(): NextResponse {
    return new NextResponse(null);
  }
}

// Export cookies mock (minimal implementation)
export const cookies = () => ({
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  has: jest.fn(),
  getAll: jest.fn(() => []),
});

// Export headers function mock
export const headers = () => new MockHeaders();
