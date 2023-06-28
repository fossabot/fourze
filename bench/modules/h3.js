import { createServer } from "http";
import { createApp, eventHandler, toNodeListener } from "h3";

const app = createApp();
app.use(eventHandler(() => {
  return { hello: "world" };
}));

createServer(toNodeListener(app)).listen(3000);
