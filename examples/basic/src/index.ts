import { EdgeRouter } from "@edgehub/router";
import { cors } from "@edgehub/router/middlewares/cors";

const worker = new EdgeRouter();

worker.use(cors());

worker.get("/api/posts", async (req, res) => {
  // Get posts from some db or rest API
  const posts = await getPosts();

  return res.send(posts);
});

worker.get("/api/posts/:id", async (req, res) => {
  const { id } = req.params;
  // Get posts from some db or rest API
  const post = await getPost(Number(id));

  return res.send(post);
});

worker.post("/api/posts", async (req, res) => {
  const body = await req.body();

  if (!body) {
    throw new Error(`POST body is not present`);
  }

  if (!body.title || !body.content) {
    throw new Error(
      `To add post please provide all these fields i.e title and content`
    );
  }

  const posts = await addPost(body);

  return res.send(posts);
});

worker.listen({ passThroughOnException: true });

// For Demo Purpose
const POSTS = [
  {
    id: 1,
    title: `EdgeRouter basic routing`,
    author: `EdgeHub`,
    content: `Lorem ipsum dolor sit amet, consectetur adipisicing elit.`,
  },
  {
    id: 2,
    title: `EdgeRouter examples`,
    author: `EdgeHub`,
    content: `Lorem ipsum dolor sit amet, consectetur adipisicing elit.`,
  },
];

async function getPosts() {
  return POSTS;
}

async function getPost(id: number) {
  return POSTS.find((post) => post.id === id);
}

async function addPost(body: Record<string, any>) {
  return [...POSTS, { ...body, id: Date.now() }];
}
