import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

app.post("/initialize", async (req, res) => {
  try {
    const email =
      req.body?.context?.customer?.email ||
      req.body?.context?.user?.email ||
      "unknown@example.com";

    const response = await fetch(
      `https://api.upcomers.com/functions/v1/admin/service/support-info?email=${encodeURIComponent(
        email
      )}`,
      {
        headers: {
          "X-Service-Token": "Giving2-Magnitude-Opium",
        },
      }
    );

    const user = await response.json();

    if (!user || !user.accounts) {
      return res.json({
        canvas: {
          content: {
            components: [
              {
                type: "text",
                text: `No data found for **${email}**.`,
              },
            ],
          },
        },
      });
    }

    // Posledních 5 účtů – nejnovější nahoře
    const accounts = user.accounts.slice(-5).reverse();

    const accountComponents = accounts.map((acc) => {
      let stateEmoji =
        acc.state === "LIVE"
          ? "🟢"
          : acc.state === "ONGOING"
          ? "🟡"
          : "🔴";

      return {
        type: "text",
        text: `${stateEmoji} **${acc.product.productKey}** (${acc.product.planSizeUsd.toLocaleString()} USD) — ${acc.platform}  
Created: ${new Date(acc.createdAt).toLocaleDateString()}`,
      };
    });

    res.json({
      canvas: {
        content: {
          components: [
            {
              type: "text",
              text: `**${user.email}**`,
            },
            {
              type: "text",
              text: `🆔 ${user.userId}`,
            },
            {
              type: "text",
              text: `Created: ${new Date(
                user.createdAt
              ).toLocaleDateString()}`,
            },
            {
              type: "text",
              text: `💸 Total spent: $${user.spentUsd.toLocaleString()}`,
            },
            { type: "divider" },
            { type: "text", text: `**Recent Accounts:**` },
            ...accountComponents,
            { type: "divider" },
            {
              type: "link_list",
              items: [
                {
                  type: "link",
                  text: "🔍 View full details in Upcomers Dashboard",
                  url: `https://supportproxy.upcomers.com/index.php?email=${encodeURIComponent(
                    user.email
                  )}`,
                },
              ],
            },
          ],
        },
      },
    });
  } catch (error) {
    console.error("❌ Error:", error);
    res.json({
      canvas: {
        content: {
          components: [
            { type: "text", text: "⚠️ Error loading data." },
            { type: "text", text: String(error) },
          ],
        },
      },
    });
  }
});

app.post("/submit", (req, res) => {
  res.json({ ok: true });
});

app.listen(3000, () =>
  console.log("✅ Intercom Canvas App running on port 3000")
);
