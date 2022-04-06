import { defineRoute } from "@fourze/core";
export default defineRoute((fourze) => {
  fourze("/api/search", (req, res) => {
    console.log(req.params);
    return ["asfavzx", "fa11s", "gg", "55", "6662"];
  });
});
