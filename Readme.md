# EdgeRouter: For Cloudflare Workers

A minimal Express.js like router for cloudflare workers.

## ✨ Features:

- Based on [trouter](https://github.com/lukeed/trouter)
- Express style routes
- Middleware support
- Small in size (1.2KB gzip)

## 🔋 Install

```
# with Yarn
yarn add edge-router

# with NPM
npm install edge-router
```

## 💻 Usage

```js
import { EdgeRouter } from "edge-router";

const worker = new EdgeRouter();

worker.use((ctx) => {
  ctx.setHeader("x-router", "EdgeRouter");
});

worker.get("/", async (ctx) => {
  try {
    return ctx.json({ hello: "world" }).end();
  } catch (error) {
    return ctx.end({ body: error.toString(), status: 500 });
  }
});

worker.listen();
```

## 👀 API

EdgeRouter extends [Trouter](https://github.com/lukeed/trouter) which means it inherist its API

```js
const worker = new EdgeRouter(options);
```

### 🚶‍♂️ Router Options

All options are optional which means you need to specify them if you want to change default behaviour.

Supported options

```js
interface RouterOptions {
  onError?: ErrorHandler;
  onNoMatch?: NoMatchHandler;
  onBeforeResponse?: BeforeResponseHandler;
}
```

#### 😟 onNoMatch

A handler executed when no route is matched. By default it sends a 404 status & Not found response.

You can configure it by passing a handler in router options as shown below.

```js
const worker = new EdgeRouter({
  onNoMatch: (ctx) => {
    return ctx
      .status(404)
      .json({ message: `Resource Not Found` })
      .end();
  },
});

worker.listen();
```

> All the menthods and properties present on `ctx` are mentioned below

#### ☠️ onError

A catch-all error handler; executed whenever a middleware throws an error.

You can configure it by passing a handler in router options as shown below.

```js
const worker = new EdgeRouter({
  onError: (error, ctx) => {
    return ctx
      .status(500)
      .json({ message: error.message || error.toString() })
      .end();
  },
});

worker.listen();
```

> All the menthods and properties present on `ctx` are mentioned below

#### 🥳 onBeforeResponse

A handler which executes right before sending a response from a route handler. **If this handler returns a Response object normal route processing will stop and the response will be sent out.**

```js
const worker = new EdgeRouter({
  onBeforeResponse(ctx, response) {
    // One usecase is to log the time taken to respond for a request
    if (ctx.start) {
      const elapsedTime = Date.now() - ctx.start;
      console.log(`Elapsed Time: ${elapsedTime}ms`);
    }
  },
});

worker.use((ctx) => {
  ctx.start = Date.now();
});

worker.listen();
```

> All the menthods and properties present on `ctx` are mentioned below

## 📣 Listen

It setsup the `fetch` event listener to listen for incoming requests.

```js
worker.listen({ passThroughOnException: true });
```

### Options

#### passThroughOnException

- default: `false`
- Cause the script to "fail open" unhandled exceptions. Instead of returning a runtime error response, the runtime proxies the request to its destination. To prevent JavaScript errors from causing entire requests to fail on uncaught exceptions, passThroughOnException causes the Worker script to act as if the exception wasn’t there. This allows the script to yield control to your origin server.

### Custom listener

You can setup custom listener as shown below

```js
const worker = new EdgeRouter();

worker.get("/", async (ctx) => {
  return ctx.json({ hello: "world" }).end();
});

addEventListener("fetch", (event) => {
  event.respondWith(worker.onRequest(event));
});
```

## 🛣 Routing

Each route is comprised of a HTTP method, a path pattern and a handler (i.e how to hanldle the request).

```js
worker.METHOD(pattern, handler);
```

#### worker

It is the instance of `EdgeRouter`

#### METHOD

It is one of HTTP method in lowercase. Supported methods are

- > For a full list of valid METHODs, please see [this list](https://github.com/lukeed/trouter#method).

#### pattern

It is a routing pattern (pathname) which is `string`. The supported pattern types are:

- static (`/posts`)
- named parameters (`/posts/:id`)
- nested parameters (`/posts/:id/users/:id`)
- optional parameters (`/users/:id?/books/:title?`)
- any match / wildcards (`/users/*`)

#### handler

- It is a function which get executed when a route is matched.
- Every route definition must contain a valid handler function, or else an error will be thrown at runtime.
- It accepts a single argument called `context`

All the menthods and properties present on `context` are

- `context.url`: Request URL
- `context.params`: Route parameters
- `context.query`: Parsed query parameters
- `context.cookies`: Parsed cookies
- `context.method`: Request method
- `context.request`: Incoming Request
- `context.event`: Clouflare worker FetchEvent
- `context.host`: Hostname extracted from `context.url`
- `context.hash`: URL hash extracted from `context.url`
- `context.pathname`: Pathname extracted from `context.url`
- `context.protocol`: Protocol extracted from `context.url`
- `context.setHeader(key: string, value: string | string[])`: A method to set header on response
- `context.setCookie(key: string, value: string, options?: {})`: A method to set cookie on response
- `context.redirect(url: string, status?: number)`: A method used to send redirect response
- `context.status(code: number, statusText?: string)`: A method used to set status code on response
- `context.json(data: object)`: A method used to set JSON as response body
- `context.text(data: string)`: A method used to set plain text as response body
- `context.raw(data: Blob | BufferSource | FormData | URLSearchParams | ReadableStream<Uint8Array> | string)`: A method used to set any supported response body.
- `content.sendStatus(status: number)`: A method used to send a `status` code without any response
- Finally `context.end` which is used to send response to a request. `end` takes one optional argument which accepts `{ body, status, headers }`

> You can chain these methods to form a response except `end`, `redirect` and `sendStatus` cannot be chanined because they are used to return response

```js
worker.get("/", async (ctx) => {
  try {
    // Here we use `ctx.json` to send `json` response
    return ctx.json({ hello: "world" }).end();
  } catch (error) {
    // Here we use `ctx.end` to send a string as response with status code 500, instead we can also use:
    // return ctx.status(500).text(error.toString()).end()
    return ctx.end({ body: error.toString(), status: 500 });
  }
});

// named parameters
worker.get("/:name", async (ctx) => {
  const { params } = ctx;
  return ctx.text(`Hello ${params.name}`).end();
});

worker.get("/api/sites/:id/publish", async (ctx) => {
  const { params, request } = ctx;
  // You can read request headers as shown below
  const AuthHeader = request.headers.get("Authorization");
  return ctx.text(`Publish Site with id: ${params.id}`).end();
});
```

## ⚡️ Middlewares

- Middleware are functions that run in between (hence "middle") receiving the request & executing your route's handler response.
- The middleware signature is same as handler.
- **Most importantly, a middleware must either return **nothing**(undefined or void) or return a response `ctx.end`. Failure to do this will result in a never-ending response**
- If middleware returns a response then normal route processing will stop and the response will be sent out.

```js
const worker = new EdgeRouter();

worker.use((ctx) => {
  // Every response will contain below header
  ctx.setHeader("x-router", "EdgeRouter");
});

worker.get("/", async (ctx) => {
  return ctx.json({ hello: "world" }).end();
});

worker.listen();
```

### CORS Middleware

This library comes with a `cors` middleware, which can be used a shown below

#### Basic

```js
import { EdgeRouter, cors } from "edge-router";

const worker = new EdgeRouter();

// CORS middleware
worker.use(cors());

worker.get("/", async (ctx) => {
  return ctx.json({ hello: "world" }).end();
});

worker.listen();
```

#### With options

```js
import { EdgeRouter, cors } from "edge-router";

const worker = new EdgeRouter();

// CORS middleware with options
worker.use(cors({ allowMethods: ["PUT", "POST"] }));

worker.get("/", async (ctx) => {
  return ctx.json({ hello: "world" }).end();
});

worker.listen();
```

#### With dynamic origin

```js
import { EdgeRouter, cors } from "edge-router";

const worker = new EdgeRouter();

// CORS middleware with options
worker.use(
  cors({
    origin: (request) => {
      const origin = request.headers.get("Origin");
      if (WHITELIST.includes(origin)) {
        return true;
      }
      return false;
    },
  })
);

worker.get("/", async (ctx) => {
  return ctx.json({ hello: "world" }).end();
});

worker.listen();
```

#### Options

##### `allowMethods`

default: `['POST','GET','PUT','PATCH','DELETE','OPTIONS']`

##### `allowHeaders`

default: `['X-Requested-With','Access-Control-Allow-Origin','X-HTTP-Method-Override','Content-Type','Authorization','Accept']`

##### `allowCredentials`

default: `true`

##### `exposeHeaders`

default: `[]`

##### `maxAge`

default: `86400`

##### `origin`

default: `*`

## 📃 License

MIT &copy; [Vinay Puppal](https://vinaypuppal.com)
