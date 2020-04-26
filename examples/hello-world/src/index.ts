import { EdgeRouter } from "@edgehub/router";

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
