import express from "express";
const app = express();
app.use(express.json());

app.post("/initialize", (req, res) => {
  const email = req.body?.context?.user?.email || "unknown@example.com";
  const iframeUrl = `https://supportproxy.upcomers.com/index.php?api_key=c43806a38ed93fb5701fcf4c31106ce4&email=${encodeURIComponent(email)}`;

  res.json({
    canvas: {
      content: {
        components: [
          {
            type: "iframe",
            url: iframeUrl,
            height: 600
          }
        ]
      }
    }
  });
});

app.listen(3000, () => console.log("✅ Intercom app running on port 3000"));
