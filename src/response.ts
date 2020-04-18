import cookie, { CookieSerializeOptions } from "cookie";

import { Context } from "./context";

type Body =
  | Blob
  | BufferSource
  | FormData
  | URLSearchParams
  | ReadableStream<Uint8Array>
  | string;

export class EdgeResponse extends Context {
  private headers: Headers | string[][] | Record<string, string> = {};
  private cookies: Record<
    string,
    { value: string; options?: CookieSerializeOptions }
  > = {};
  private statusCode?: number;
  private statusText?: string;
  private body?: Body | null;
  private type?: string;
  public _response?: Response;
  public raw(data: any, type?: string) {
    this.body = data;
    if (type) {
      this.type = type;
    }
    return this;
  }
  public text(data: string) {
    this.body = data;
    if (!this.type) {
      this.type = "text/plain";
    }
    return this;
  }
  public html(data: string) {
    this.body = data;
    if (!this.type) {
      this.type = "text/html; charset=utf-8";
    }
    return this;
  }
  public status(code: number, statusText?: string) {
    this.statusCode = code;
    this.statusText = statusText;
    return this;
  }
  public setHeader(key: string, value: string | string[]) {
    this.headers = {
      ...this.headers,
      [key]: Array.isArray(value) ? value.join(",") : value,
    };
    return this;
  }
  public setCookie(
    key: string,
    value: string,
    options?: CookieSerializeOptions
  ) {
    this.cookies = {
      ...this.cookies,
      [key]: { value, options },
    };
    return this;
  }
  public redirect(url: string, status?: number) {
    return Response.redirect(url, status);
  }
  public sendStatus(status: number) {
    const headers = this._getheaders();
    return new Response(null, { status, headers });
  }
  public end(
    data: {
      body?: Body | null;
      status?: number;
      statusText?: string;
      headers?: Headers | string[][] | Record<string, string>;
    } = {}
  ) {
    const {
      headers: endHeaders = {},
      status = this.statusCode,
      statusText = this.statusText,
      body = this.body,
    } = data;
    this.headers = {
      ...this.headers,
      ...endHeaders,
    };
    const headers = this._getheaders();
    return new Response(body, { status, headers, statusText });
  }
  public json(data: object) {
    return this._json(data).end();
  }
  public send(data?: string | number | boolean | object) {
    switch (typeof data) {
      case "boolean":
      case "number": {
        return this.text(String(data)).end();
      }
      case "object": {
        return this._json(data).end();
      }
      case "string": {
        return this.html(data).end();
      }
      default: {
        return this.end();
      }
    }
  }
  private _json(data: object) {
    this.body = JSON.stringify(data);
    if (!this.type) {
      this.type = "application/json";
    }
    return this;
  }
  private _getheaders() {
    const cookieHeader = Object.keys(this.cookies).reduce(
      (p: string, key: string) => {
        const { value, options } = this.cookies[key];
        return `${p}${cookie.serialize(key, value, options)}`;
      },
      ``
    );
    return {
      ...(this.type ? { "Content-Type": this.type } : {}),
      ...this.headers,
      "Set-Cookie": cookieHeader,
    };
  }
}
