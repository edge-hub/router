## ✨ Features

- Based on [trouter](https://github.com/lukeed/trouter)
- Express style routes.
- Helper functions
  - Read requests: Built-in body-parser, cookie-parser, and a query string-parser.
  - To modify headers and
  - Send a response.
- Middleware support.
  - CORS Middleware
  - Workers site Middleware
- Domain routing.

## 🔋 Install

With Yarn

```bash
yarn add @edgehub/cf-router
```

With NPM

```bash
npm install @edgehub/cf-router
```

## 💻 Hello world example

You can try this example with [wrangler](https://github.com/cloudflare/wrangler) by running this command

```bash
wrangler generate myapp https://github.com/edge-hub/router/tree/master/examples/hello-world
```

```js
import { EdgeRouter } from "@edgehub/cf-router";

const worker = new EdgeRouter();

// Middleware to set a header for all routes
worker.use((req, res) => {
  res.setHeader("x-router", "EdgeRouter");
});

// The worker responds with `Hello World` for requests to root URL(/). For every other path, it will fallback to origin response if its exists or error.
worker.get("/", (req, res) => {
  return res.send(`Hello World`);
});

worker.listen({ passThroughOnException: true });
```

> You can find more examples [here](https://github.com/edge-hub/router/tree/master/examples/)

## 🥳 Basic Routing

Routing refers to determining how a worker responds to a client request to a particular endpoint, which is a URI (or path) and a specific HTTP request method (GET, POST, and so on).

Each route can have one or more handler functions, which are executed when the route is matched.

Route definition takes the following structure:

```js
worker.METHOD(PATTERN, HANDLER);
```

Where:

- `worker` is an instance of EdgeRouter
- `METHOD` is one of the HTTP methods in lowercase. For a full list of valid METHODs, please see [this list](https://github.com/lukeed/trouter#method)
- `PATTERN` is a routing pattern (pathname) which is `string`. The supported pattern types are:
  - static (`/posts`)
  - named parameters (`/posts/:id`)
  - nested parameters (`/posts/:id/users/:id`)
  - optional parameters (`/users/:id?/books/:title?`)
  - any match / wildcards (`/users/*`)
- `HANDLER` is the function executed when the route is matched.
  - Every route definition must contain a valid handler function, or else an error will be thrown at runtime.
  - It accepts a two arguments **[req](#📨-request)** and **[res](#📣-response)**

## 👀 API

EdgeRouter extends [Trouter](https://github.com/lukeed/trouter) which means it inherits its API

### ✏️ Options

```js
import { EdgeRouter } from "@edgehub/cf-router";

const worker = new EdgeRouter(options);
```

> All options are optional which means you need to specify them if you want to change the default behavior.

The following table describes the properties of the optional options object.

| Property         | Description                                                                                                                                                                                           | Type     | Default   |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------- |
| onNoMatch        | A handler to be executed when no route is matched.                                                                                                                                                    | Function | undefined |
| onError          | A catch-all error handler; executed whenever a middleware throws an error.                                                                                                                            | Function | undefined |
| onBeforeResponse | A handler which executes right before sending a response from a route handler.**If this handler returns a Response object then normal route processing will stop and the response will be sent out.** | Function | undefined |

> The signature of these handlers is same as the route handlers which you saw in [Basic Routing](#🥳-basic-routing)

### ☁️ Instance

The `worker` object conventionally denotes the Cloudflare worker. Create it by calling the `new EdgeRouter()` class exported by the `@edgehub/cf-router` module:

```js
import { EdgeRouter } from "@edgehub/cf-router";

const worker = new EdgeRouter();

// The worker responds with `Hello World` for requests to root URL(/). For every other path, it will fallback to origin response if its exists or error.
worker.get("/", (req, res) => {
  return res.send(`Hello World`);
});

worker.listen({ passThroughOnException: true });
```

The `worker` object has methods for

- Routing HTTP requests; see for example, [worker.METHOD()](#workermethod)
- Configuring middleware; see [worker.use()](#workeruse)
- Listening for incoming requests; see [worker.listen()](#workerlisten)

#### worker.METHOD()

Routes an HTTP request, where METHOD is the HTTP method of the request, such as GET, PUT, POST, and so on, in lowercase.

See [Basic Routing Section](#🥳-basic-routing) for more info.

#### worker.use()

Mounts the specified middleware function or functions at the specified path or for all routes.
_The middleware function is executed when the base of the requested path matches path or for every request in case of global middleware_.

See [Middlewares Section](#middlewares) for more info.

#### worker.listen()

It defines the `fetch` event listener to listen for incoming requests.

Example:

```js
worker.listen({ passThroughOnException: true });
```

Options:

| Property               | Description                                                                                                                                                                                                                                                                                                                                                                                                | Type    | Default |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------- |
| passThroughOnException | Cause the script to "fail open" unhandled exceptions. Instead of returning a runtime error response, the runtime proxies the request to its destination. To prevent JavaScript errors from causing entire requests to fail on uncaught exceptions, passThroughOnException causes the Worker script to act as if the exception wasn’t there. This allows the script to yield control to your origin server. | boolean | false   |

#### Custom listener

You can set up a custom listener as shown below

```js
import { EdgeRouter } from "@edgehub/cf-router";

const worker = new EdgeRouter();

worker.get("/", async (req, res) => {
  return res.send({ hello: "world" });
});

addEventListener("fetch", (event) => {
  event.respondWith(worker.onRequest(event));
});
```

### 📨 Request

The req object has properties for the request query string, parameters, body, HTTP headers, original _Fetch Request_, _FetchEvent_ and so on. In this documentation and by convention, the object is always referred to as req (and the response is res) but its actual name is determined by the parameters to the callback function in which you’re working.

#### req.query

This property is an object containing a property for each query string parameter in the route.
It can be:

- This object defaults to {}
- Each property inside the query object can be either `string` or `array` as shown below

```js
// GET /posts?limit=10
console.log(req.query.limit);
// => "10"

// GET /search?tags=javascript&tags=react
console.log(req.query.tags);
// => ["javascript", "react"]
```

#### req.params

This property is an object containing properties mapped to the named route “parameters”. For example, if you have the route `/posts/:id`, then the “name” property is available as `req.params.id`. This object defaults to `{}`.

```js
// GET /posts/123456
console.log(req.params.id);
// => "123456"
```

#### req.url

This property contains the original request URL as shown below.

```js
// If request comes for https://edgehub.in/posts/123456
worker.get("/posts/:id", (req, res) => {
  console.log(req.url);
});
// => https://edgehub.in/posts/123456
```

#### req.host

This property contains `host` parsed from the original request URL as shown below.

```js
// If request comes for https://edgehub.in/posts/123456
worker.get("/posts/:id", (req, res) => {
  console.log(req.url);
});
// => edgehub.in
```

#### req.pathname

This property contains `path` parsed from the original request URL as shown below.

```js
// If request comes for https://edgehub.in/posts/123456
worker.get("/posts/:id", (req, res) => {
  console.log(req.url);
});
// => /posts/123456
```

#### req.protocol

This property contains `protocol` parsed from the original request URL as shown below.

```js
// If request comes for https://edgehub.in/posts/123456
worker.get("/posts/:id", (req, res) => {
  console.log(req.url);
});
// => https:
```

#### req.method

This property contains a string corresponding to the HTTP method of the request: GET, POST, PUT, and so on.

#### req.search

This property contains the unparsed query string parameter in the route.

```js
// GET /posts?limit=10
console.log(req.query.limit);
// => "?limit=10"
```

#### req.querystring

This property is same as [req.search](#req.search) but without the leading `?`.

```js
// GET /posts?limit=10
console.log(req.query.limit);
// => "limit=10"
```

#### req.cookies

EdgeRouter includes built-in cookie parser and this property is an object that contains cookies sent by the request. If the request contains no cookies, it defaults to {}.

```js
// Cookie: token=skenfklwnefklwnfkwnefklmwekldm
console.log(req.cookies.token);
// => // "skenfklwnefklwnfkwnefklmwekldm"
```

#### req.headers

This object conatains the request header list. You can use

- `get()` to get a header by name and
- `has()` to check if a header exists

```js
console.log(req.headers.has("content-type"));
// => true

console.log(req.headers.get("content-type"));
// => "application/json"
```

#### req.header()

Returns the specified HTTP request header field (case-insensitive match).

```js
req.header("content-type");
// => "text/plain"

req.header("Content-Type");
// => "text/plain"
```

#### req.body()

Returns an object which contains key-value pairs of data submitted in the request body.

> It's a `async` function so you need to use `await` to get the data back when called.

```js
// A post request sending this JSON data "{"name": "EdgeRouter"}"
worker.post("/user", async (req, res) => {
  const data = await req.body();
  console.log(data);
});
// => { name: "EdgeRouter" }
```

#### req.\_originalRequest

This property contains original fetch request recieved by the Coudflare Worker. You can read about available properties and methods on this object [here](https://developers.cloudflare.com/workers/reference/apis/request/)

#### req.\_event

This property contains original fetchEvent recieved by the Coudflare Worker. You can read about available properties and methods on this object [here](https://developers.cloudflare.com/workers/reference/apis/fetch-event/)

### 📣 Response

The res object is used to create a response that a worker sends when it gets an HTTP request. In this documentation and by convention, the object is always referred to as res (and the request is req) but its actual name is determined by the parameters to the callback function in which you’re working.

#### res.setHeader()

Sets the response’s HTTP header field to value.

```js
res.setHeader(field [, value])
```

#### res.setCookie()

Sets cookie name to value. The value parameter may be a string or object converted to JSON.

```js
res.cookie(name, value [, options])
```

> The options parameter is an object that can have the properties mentioned [here](https://github.com/jshttp/cookie#options-1).

#### res.status()

Sets the HTTP status for the response. It is a chainable as shown below

```js
res.status(400).send("Bad Request");
```

#### res.sendStatus()

Sets the response HTTP status code to statusCode and creates its string representation as the response body.

> `res.sendStatus` only creates the Response and it does not really send it. Inorder to send it you need to return the response generated from your route handler.

```js
import { EdgeRouter } from "@edgehub/cf-router";

const worker = new EdgeRouter();

worker.get("/", async (req, res) => {
  return res.sendStatus(200);
});

worker.listen({ passThroughOnException: true });
```

#### res.send()

Creates the HTTP response. It takes `body` as argument.

- The `body` parameter can be a String, a Number, a Boolean, an object, or an Array.
- When the `body` is an object or array the response is sent with content-type `application/json`
- For rest of the types it's sent with content-type `text/html`

For example:

```js
res.send({ some: "json" });
res.send("<p>some html</p>");
res.status(404).send("Sorry, we cannot find that!");
res.status(500).send({ error: "something blew up" });
```

> `res.send` only creates the Response and it does not really send it. Inorder to send it you need to return the response generated from your route handler.

```js
import { EdgeRouter } from "@edgehub/cf-router";

const worker = new EdgeRouter();

worker.get("/", async (req, res) => {
  return res.send({ hello: "world" });
});

worker.listen({ passThroughOnException: true });
```

#### res.redirect()

Redirects to the specified URL and status, a positive integer that corresponds to an HTTP status code . If not specified, status defaults to “302 “Found”.

It takes `url` and `status` as arguments

```js
// Default status code 302
res.redirect("http://google.com");

// With status code 301
res.redirect("http://google.com", 301);
```

### 🧚 Middlewares

Middleware are functions that run in between (hence "middle") receiving the request & executing your route's handler response.

#### Middleware Sequence

```js
worker.use([path], [function, ...] function)
```

- Global middleware are defined via `worker.use('/', ...fn)` or `worker.use(...fn)`, which are synonymous. Because every request's pathname begins with a `/`, this tier is always triggered.
- Sub-group or "filtered" middleware are defined with a base pathname that's more specific than `/`. For example, defining `worker.use('/users', ...fn)` will run on any `/users/**/*` request. These functions will execute after "global" middleware but before the route-specific handler.
- Route handlers match specific paths and execute last in the chain. They must also match the method action.

> Most importantly, a middleware must either terminate the response (res.send) by returning it or return **nothing**. When it returns nothing the next route/middleware handler will invoked.

#### Middleware Example

```js
import { EdgeRouter } from "@edgehub/cf-router";

const worker = new EdgeRouter();

// simple logger for this router's requests
// all requests to this router will first hit this middleware
worker.use((req, res) => {
  console.log(req.method, req.url, req.path);
});

// Middleware to set a header for all routes
worker.use((req, res) => {
  res.setHeader("x-router", "EdgeRouter");
});

// this will only be invoked if the path starts with /bar from the mount point
worker.use("/bar", (req, res) => {
  // ... maybe some additional /bar logging ...
});

// Authorization middleware
worker.use((req, res) => {
  // mutate req; available later
  req.token = req.headers.get("authorization");
  if (!req.token) {
    return res.status(401).send(`No token!`);
  }
});

// The worker responds with `Hello World` for requests to root URL(/). For every other path, it will fallback to origin response if its exists or error.
worker.get("/", (req, res) => {
  return res.send(`Hello World`);
});

worker.listen({ passThroughOnException: true });
```

#### Built In Middlewares

##### CORS Middleware

This library comes with a cors middleware, which can be used a shown below

```js
import { EdgeRouter, cors } from "@edgehub/cf-router";

const worker = new EdgeRouter();

// CORS middleware
worker.use(cors());

// The worker responds with `Hello World` for requests to root URL(/). For every other path, it will fallback to origin response if its exists or error.
worker.get("/", (req, res) => {
  return res.send(`Hello World`);
});

worker.listen({ passThroughOnException: true });
```

Options:

| Property         | Type            | Default                                                                                                             |
| ---------------- | --------------- | ------------------------------------------------------------------------------------------------------------------- |
| allowMethods     | Array           | ['POST','GET','PUT','PATCH','DELETE','OPTIONS']                                                                     |
| allowHeaders     | Array           | ['X-Requested-With','Access-Control-Allow-Origin','X-HTTP-Method-Override','Content-Type','Authorization','Accept'] |
| exposeHeaders    | Array           | []                                                                                                                  |
| allowCredentials | Boolean         | true                                                                                                                |
| origin           | String/Function | \*                                                                                                                  |
| maxAge           | Number          | 86400                                                                                                               |

```js
// CORS middleware with options
worker.use(
  cors({
    allowMethods: ["PUT", "POST"],
    origin: (request) => {
      const origin = request.headers.get("Origin");
      if (WHITELIST.includes(origin)) {
        return true;
      }
      return false;
    },
  })
);
```

> Here `request` is original fetch request as mentioned [here](https://developers.cloudflare.com/workers/reference/apis/request/)

##### Worker Sites Middleware

This library also comes with a `workersSite` middleware, which can be used to add support for [workers sites](https://developers.cloudflare.com/workers/sites)

> Inorder to to use this middleware you need to install this package [@cloudflare/kv-asset-handler](https://github.com/cloudflare/kv-asset-handler) `yarn add @cloudflare/kv-asset-handler`

```js
import { EdgeRouter, workersSite } from "@edgehub/cf-router";

const worker = new EdgeRouter();

// workersSite middleware
worker.use(workersSite());

// Here you can handle more routes

worker.listen({ passThroughOnException: true });
```

> The options supported by this middleware are same as of [cloudflare/kv-asset-handler](https://github.com/cloudflare/kv-asset-handler). You can find supported **[options here](https://github.com/cloudflare/kv-asset-handler#optional-arguments)**

```js
// Example with options
worker.use(
  workersSite({
    cacheControl: {
      browserTTL: null, // do not set cache control ttl on responses
      edgeTTL: 2 * 60 * 60 * 24, // 2 days
      bypassCache: false, // do not bypass Cloudflare's cache
    },
  })
);
```

## 🕸️ Domain Routing

This library exposes `VHostRouter` to support domain routing. CLoudflare workers allows to associate multiple domains/subdomains for a worker script as [mentioned here](https://developers.cloudflare.com/workers/about/routes/)

So using `VHostRouter` you can define/scope `EdgeRouter` to a particular domain and handler it's requests as shown below.

### API

The `vhost` object conventionally denotes the Virtual Host. Create it by calling the `new VHostRouter()` class exported by the @edgehub/cf-router module:

```js
import { EdgeRouter, VHostRouter } from "@edgehub/cf-router";

const vhost = VHostRouter();
const apiRouter = EdgeRouter();
const cdnRouter = EdgeRouter();

// API routes
apiRouter.get("/posts", (req, res) => {
  return res.send({ posts: { title: "About EdgeRouter" } });
});
apiRouter.post("/posts", async (req, res) => {
  const data = await req.body();
  // store data in db and send response
  return res.send(data);
});

// CDN routes
cdnRouter.all("*", (req, res) => {
  // Fetch image from CDN and modify on the fly to webp or resize ...etc
});

vhost.use("api.example.com", apiRouter);
vhost.use("cdn.example.com", imageRouter);

vhost.listen({ passThroughOnException: true });
```

The `vhost` object has following methods:

- Listening for incoming requests `vhost.listen()` and it's simillar to [worker.listen()](#workerlisten)
- Routing requests for a particular domain `vhost.use()`
  ```js
  vhost.use(DOMAIN_PATTERN, EDGEROUTER_INSTANCE);
  ```
  - `DOMAIN_PATTERN`: It can be a string or a RegExp object. When `DOMAIN_PATTERN` is a string it can contain `*` to match 1 or more characters in that section of the `DOMAIN_PATTERN`. When `DOMAIN_PATTERN` is a RegExp, it will be forced to case-insensitive (since `DOMAIN_PATTERN`s are) and will be forced to match based on the start and end of the `DOMAIN_PATTERN`.
  - `EDGEROUTER_INSTANCE`: This is executed when a `DOMAIN_PATTERN` is matched.
  - When `DOMAIN_PATTERN` is matched and the request is sent down to a EDGEROUTER_INSTANCE, the req.vhost property will be populated with an object. This object will have numeric properties corresponding to each wildcard (or capture group if RegExp object provided) and the hostname that was matched.

## 👉 Contributing

Please see our [contributing.md](https://github.com/edge-hub/router/blob/master/.github/CONTRIBUTING.md).

## 👨‍💻 Authors

- [VinayPuppal](https://vinaypuppal.com)

See also the list of [contributors](https://github.com/edge-hub/router/graphs/contributors) who participated in this project. Join us 🍻
