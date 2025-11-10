import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Extract email from Intercom context
function extractEmail(body) {
  return (
    body?.context?.customer?.email ||
    body?.context?.user?.email ||
    body?.context?.contact?.email ||
    body?.customer?.email ||
    body?.user?.email ||
    body?.input_values?.email ||
    "unknown@example.com"
  );
}

// Helper to format date nicely
function formatDate(dateString) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Initialize route
app.post("/initialize", async (req, res) => {
  const email = extractEmail(req.body);
  console.log("📩 Email detected:", email);

  const apiUrl = `https://api.upcomers.com/functions/v1/admin/service/support-info?email=${encodeURIComponent(
    email
  )}`;

  try {
    const response = await fetch(apiUrl, {
      headers: { "X-Service-Token": "Giving2-Magnitude-Opium" },
    });

    if (!response.ok) {
      console.error("❌ API status:", response.status);
      return res.json({
        canvas: { content: { components: [{ type: "text", text: "API error" }] } },
      });
    }

    const user = await response.json();
    if (!user || !user.accounts?.length) {
      return res.json({
        canvas: {
          content: { components: [{ type: "text", text: `No data found for ${email}.` }] },
        },
      });
    }

    // build account list
    const accounts = user.accounts.slice(-10).reverse();

    const accountItems = accounts.map((acc) => {
      const breach = acc.currentPhase?.accountClosure?.metadata;
      let breachText = "";

      if (breach) {
        breachText = `⚠️ ${breach.violationType
          .replace(/_/g, " ")
          .toUpperCase()} breach – equity ${breach.equityAtFailure} / limit ${breach.limitValue}`;
      }

      let emoji =
        acc.state === "LIVE"
          ? "🟢"
          : acc.state === "ONGOING"
          ? "🟡"
          : acc.state === "END_FAIL"
          ? "🔴"
          : "⚪";

      return {
        type: "item",
        id: `${acc.id}`,
        title: `${emoji} ${acc.product.productKey} ${acc.product.planSizeUsd.toLocaleString()} USD – ${acc.platform}`,
        subtitle: `${acc.state} | Created ${formatDate(acc.createdAt)}${
          breachText ? " | " + breachText : ""
        }`,
      };
    });

    res.json({
      canvas: {
        content: {
          components: [
            {
              type: "text",
              text: `**${user.email}**  
🆔 ${user.userId}  
🗓️ Created: ${formatDate(user.createdAt)}  
💸 Spent: $${user.spentUsd?.toLocaleString()}`,
            },
            { type: "divider" },
            { type: "text", text: "**Latest Accounts:**" },
            { type: "list", items: accountItems },
            { type: "divider" },
            {
              type: "link_list",
              items: [
                {
                  type: "link",
                  text: "🔍 View full profile in Upcomers Dashboard",
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
  } catch (err) {
    console.error("⚠️ Error:", err);
    res.json({
      canvas: {
        content: {
          components: [
            { type: "text", text: "⚠️ Internal server error" },
            { type: "text", text: String(err) },
          ],
        },
      },
    });
  }
});

// dummy submit
app.post("/submit", (req, res) => {
  res.json({
    canvas: {
      content: { components: [{ type: "text", text: "✅ Action handled" }] },
    },
  });
});

app.listen(PORT, () => console.log(`✅ Intercom Canvas App running on port ${PORT}`));
