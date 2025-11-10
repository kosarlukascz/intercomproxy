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
                text: "⚠️ API Error - Unable to fetch data. Please try again.",
                style: "error"
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
                text: `No trading accounts found for ${email}`,
                style: "muted"
              }
            ],
          },
        },
      });
    }

    // Separate live accounts and ended accounts
    const liveAccounts = user.accounts
      .filter(acc => acc.state === "LIVE")
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const endedAccounts = user.accounts
      .filter(acc => acc.state !== "LIVE")
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    // Combine: all live accounts first, then 5 latest ended accounts
    const displayAccounts = [...liveAccounts, ...endedAccounts];

    const formatAccount = (acc) => {
      const breach = acc.currentPhase?.accountClosure?.metadata;
      let breachText = "";

      if (breach) {
        const violationType = breach.violationType.replace(/_/g, " ");
        breachText = ` ⚠️ ${violationType} breach — equity ${breach.equityAtFailure} / limit ${breach.limitValue}`;
      }

      let emoji = acc.state === "LIVE" ? "🟢" : "🔴";
      const accountUrl = `https://admin.upcomers.com/accounts/${acc.accountId}`;
      const planSize = acc.product.planSizeUsd.toLocaleString();

      return {
        type: "text",
        text: `${emoji} [${acc.product.productKey} ($${planSize})](${accountUrl}) — ${acc.platform} | ${acc.state} | ${formatDate(acc.createdAt)}${breachText}`,
      };
    };

    const userUrl = `https://admin.upcomers.com/users/${user.userId}`;
    const supportUrl = `https://supportproxy.upcomers.com/index.php?email=${encodeURIComponent(user.email)}`;

    const components = [
      {
        type: "text",
        text: `**${user.email}**`,
        style: "header"
      },
      {
        type: "text",
        text: `🆔 ${user.userId} | 📅 ${formatDate(user.createdAt)} | 💰 $${user.spentUsd?.toLocaleString() || "0"}`,
        style: "muted"
      },
      {
        type: "button",
        label: "👤 View User Dashboard",
        action: {
          type: "url",
          url: userUrl
        }
      },
      { type: "spacer", size: "m" }
    ];

    // Add live accounts section if any
    if (liveAccounts.length > 0) {
      components.push(
        {
          type: "text",
          text: `**🟢 Live Accounts (${liveAccounts.length})**`,
          style: "header"
        }
      );
      liveAccounts.forEach(acc => {
        components.push(formatAccount(acc));
      });
      components.push({ type: "spacer", size: "s" });
    }

    // Add ended accounts section if any
    if (endedAccounts.length > 0) {
      components.push(
        {
          type: "text",
          text: `**📊 Recent Ended Accounts (${endedAccounts.length})**`,
          style: "header"
        }
      );
      endedAccounts.forEach(acc => {
        components.push(formatAccount(acc));
      });
    }

    // Add footer with link
    components.push(
      { type: "spacer", size: "m" },
      {
        type: "button",
        label: "🔍 View Full Profile",
        action: {
          type: "url",
          url: supportUrl
        },
        style: "secondary"
      }
    );

    res.json({
      canvas: {
        content: {
          components: components
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
              text: "Internal server error",
              style: "error"
            },
            { 
              type: "text", 
              text: String(err),
              style: "muted"
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
            text: "Action completed successfully",
            style: "success"
          }
        ],
      },
    },
  });
});

app.listen(PORT, () =>
  console.log(`✅ Intercom Canvas App running on port ${PORT}`)
);
