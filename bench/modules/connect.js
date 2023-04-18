import connect from "connect";

const app = connect();
app.use((req, res) => {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ hello: "world" }));
});

app.listen(3000);
