import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// Extract email safely
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

// Format date nicely
function formatDate(dateString) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

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
        canvas: {
          content: {
            components: [
              { 
                type: "text", 
                text: "⚠️ **API Error**\n\nUnable to fetch data. Please try again." 
              }
            ],
          },
        },
      });
    }

    const user = await response.json();

    if (!user || !user.accounts?.length) {
      return res.json({
        canvas: {
          content: {
            components: [
              { 
                type: "text", 
                text: `**No Data Found**\n\nNo trading accounts found for \`${email}\`` 
              }
            ],
          },
        },
      });
    }

    const accounts = user.accounts.slice(-10).reverse();

    const accountItems = accounts.map((acc) => {
      const breach = acc.currentPhase?.accountClosure?.metadata;
      let breachText = "";

      if (breach) {
        const violationType = breach.violationType.replace(/_/g, " ");
        breachText = `\n⚠️ **${violationType.toUpperCase()}** breach — equity ${breach.equityAtFailure} / limit ${breach.limitValue}`;
      }

      let emoji =
        acc.state === "LIVE"
          ? "🟢"
          : acc.state === "ONGOING"
          ? "🟡"
          : acc.state === "END_FAIL"
          ? "🔴"
          : "⚪";

      const accountUrl = `https://admin.upcomers.com/accounts/${acc.accountId}`;
      const planSize = acc.product.planSizeUsd.toLocaleString();

      return {
        type: "text",
        text: `${emoji} [**${acc.product.productKey}** (${planSize} USD)](${accountUrl})\n${acc.platform} • ${acc.state} • ${formatDate(acc.createdAt)}${breachText}`,
      };
    });

    const userUrl = `https://admin.upcomers.com/users/${user.userId}`;
    const supportUrl = `https://supportproxy.upcomers.com/index.php?email=${encodeURIComponent(user.email)}`;

    res.json({
      canvas: {
        content: {
          components: [
            {
              type: "text",
              text: `### [${user.email}](${userUrl})\n\n**User ID:** \`${user.userId}\`\n**Created:** ${formatDate(user.createdAt)}\n**Total Spent:** $${user.spentUsd?.toLocaleString() || "0"}`,
            },
            { type: "divider" },
            { 
              type: "text", 
              text: `### 📊 Latest Accounts (${accounts.length})` 
            },
            ...accountItems,
            { type: "divider" },
            {
              type: "text",
              text: `[🔍 View Full Profile](${supportUrl}) • [👤 User Dashboard](${userUrl})`,
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
            { 
              type: "text", 
              text: "**⚠️ Internal Server Error**\n\nSomething went wrong. Please contact support." 
            },
            { 
              type: "text", 
              text: `\`\`\`\n${String(err)}\n\`\`\`` 
            },
          ],
        },
      },
    });
  }
});

app.post("/submit", (req, res) => {
  res.json({
    canvas: {
      content: {
        components: [
          { 
            type: "text", 
            text: "✅ **Action Completed**\n\nYour request has been processed." 
          }
        ],
      },
    },
  });
});

app.listen(PORT, () =>
  console.log(`✅ Intercom Canvas App running on port ${PORT}`)
);
