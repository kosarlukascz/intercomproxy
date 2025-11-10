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

// Translate state to readable text
function translateState(state) {
  const translations = {
    "LIVE": "LIVE",
    "END_FAIL": "FAILED",
    "ONGOING": "ONGOING",
    "END_SUCCESS": "PASSED"
  };
  return translations[state] || state;
}

// Translate violation type
function translateViolation(violationType) {
  const translations = {
    "daily_drawdown": "daily drawdown",
    "trailing_drawdown": "trailing drawdown",
    "max_drawdown": "max drawdown"
  };
  return translations[violationType] || violationType.replace(/_/g, " ");
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
                text: "⚠️ API Error - Unable to fetch data. Please try again."
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
                text: `No trading accounts found for ${email}`
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

    const formatAccount = (acc) => {
      const breach = acc.currentPhase?.accountClosure?.metadata;
      let breachText = "";

      if (breach) {
        const violationType = translateViolation(breach.violationType);
        const equity = parseFloat(breach.equityAtFailure);
        const limit = parseFloat(breach.limitValue);
        const diff = Math.abs(equity - limit).toFixed(2);
        
        breachText = `\n⚠️ ${violationType} breach — equity ${breach.equityAtFailure} / limit ${breach.limitValue}\n≈ diff (${diff})`;
      }

      let emoji = acc.state === "LIVE" ? "🟢" : "🔴";
      const accountUrl = `https://admin.upcomers.com/accounts/${acc.id}`;
      const planSize = acc.product.planSizeUsd.toLocaleString();
      const state = translateState(acc.state);

      return {
        type: "text",
        text: `${emoji} [${acc.product.productKey} ($${planSize})](${accountUrl}) (${acc.platform})\n${state} - ${formatDate(acc.createdAt)}${breachText}`,
      };
    };

    const userUrl = `https://admin.upcomers.com/users/${user.userId}`;
    const supportUrl = `https://supportproxy.upcomers.com/index.php?email=${encodeURIComponent(user.email)}`;

    const components = [
      {
        type: "text",
        text: `[${user.email}](${userUrl})`
      },
      {
        type: "text",
        text: `🆔 ${user.userId}\n📅 Created: ${formatDate(user.createdAt)}\n💰 Spent: $${user.spentUsd?.toLocaleString() || "0"}`
      },
      {
        type: "button",
        id: "view_user_dashboard",
        label: "👤 View User Dashboard",
        action: {
          type: "url",
          url: userUrl
        }
      },
      { type: "divider" }
    ];

    // Add live accounts section if any
    if (liveAccounts.length > 0) {
      components.push(
        {
          type: "text",
          text: `🟢 Live Accounts (${liveAccounts.length})`
        }
      );
      liveAccounts.forEach(acc => {
        components.push(formatAccount(acc));
      });
      components.push({ type: "divider" });
    }

    // Add ended accounts section if any
    if (endedAccounts.length > 0) {
      components.push(
        {
          type: "text",
          text: `📊 Recent Ended Accounts (${endedAccounts.length})`
        }
      );
      endedAccounts.forEach(acc => {
        components.push(formatAccount(acc));
      });
      components.push({ type: "divider" });
    }

    // Add footer with link
    components.push(
      {
        type: "button",
        id: "view_full_profile",
        label: "🔍 View Full Profile",
        action: {
          type: "url",
          url: supportUrl
        }
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
              text: "⚠️ Internal server error"
            },
            { 
              type: "text", 
              text: String(err)
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
            text: "✅ Action completed successfully"
          }
        ],
      },
    },
  });
});

app.listen(PORT, () =>
  console.log(`✅ Intercom Canvas App running on port ${PORT}`)
);
