# 🤖 adiBot

> A smart, fast Discord bot powered by **Grok AI (xAI)** — built to chat, assist, and manage your server.

---

## ✨ Features

- 💬 **AI Chat** — Powered by Grok (`grok-beta`), adiBot answers anything intelligently
- 🧠 **Conversation Memory** — Remembers up to 20 messages of context per user
- 🛡️ **Rate Limiting** — Max 3 AI requests per 10 seconds per user to prevent spam
- 🔗 **URL Shortener** — Instantly shorten any link via `/create`
- 🗑️ **Chat Cleaner** — Bulk-delete up to 100 messages with one command
- 🏓 **Ping** — Check bot and API latency anytime
- ⚡ **Instant Replies** — Lightning-fast responses for greetings and common phrases
- 🔒 **Permission Guards** — Moderation commands locked to users with the right permissions

---

## 💡 Commands

### Prefix Commands (type in chat)

| Command | Description |
|--------|-------------|
| `hello` / `hi` / `hey` | Get a friendly greeting |
| `name?` / `who are you?` | Learn about adiBot |
| `help` / `!help` | Show all commands |
| `!ask <question>` | Ask Grok AI anything |
| `!ping` | Check if the bot is alive |
| `!delete chat` | Bulk-delete messages *(requires Manage Messages)* |

### Slash Commands

| Command | Description |
|--------|-------------|
| `/ask <question>` | Ask Grok AI anything |
| `/create <url>` | Shorten a URL via TinyURL |
| `/ping` | Check bot + API latency |
| `/delete-chat [amount]` | Delete 1–100 messages *(requires Manage Messages)* |

---

## ➕ Add adiBot to Your Server

👉 **[Click here to invite adiBot](#)**

---

## 🆕 New to Discord? Start Here

### Step 1 — Create a Discord Account
1. Go to [discord.com](https://discord.com) and click **Register**
2. Fill in your email, username, password, and date of birth
3. Verify your email via the link Discord sends you

### Step 2 — Create Your Own Server
1. In the left sidebar, click the **➕** at the bottom
2. Choose **"Create My Own"** → **"For me and my friends"**
3. Name your server and click **Create**

### Step 3 — Add adiBot
1. Click the invite link above
2. Select your server under **"Add to Server"**
3. Click **Continue** → **Authorize** → complete CAPTCHA if prompted

### Step 4 — Start Chatting
Open any text channel and try `hello` or `!ask What can you do?` 🎉

---

## 🔒 Permissions

| Permission | Reason |
|-----------|--------|
| Read Messages | To receive your messages |
| Send Messages | To reply in channels |
| Manage Messages | To bulk-delete chat when requested |
| Use Slash Commands | To power `/ask`, `/create`, `/ping`, `/delete-chat` |

---

## 🛠️ Tech Stack

| Tool | Purpose |
|------|---------|
| [Discord.js](https://discord.js.org/) | Discord API wrapper |
| [Grok AI — xAI](https://x.ai/) | AI model powering responses |
| [OpenAI SDK](https://npmjs.com/package/openai) | xAI-compatible API client |
| [TinyURL API](https://tinyurl.com/) | URL shortening |
| [Node.js](https://nodejs.org/) | Runtime environment |
| [nodemon](https://nodemon.io/) | Dev auto-restart |

---

## 🚀 Self-Hosting

### Prerequisites
- Node.js v18+
- A Discord bot token — [Discord Developer Portal](https://discord.com/developers/applications)
- A Grok API key — [console.x.ai](https://console.x.ai)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/your-username/adibot.git
cd adibot

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your keys
```

### `.env`

```env
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_application_client_id
XAI_API_KEY=your_xai_api_key
```

### Run

```bash
# Deploy slash commands (only needed once, or when commands change)
node deploy.js

# Start the bot
npm run dev
```

---

## ⚙️ Configuration

You can tweak these values at the top of `index.js`:

| Constant | Default | Description |
|----------|---------|-------------|
| `MAX_HISTORY` | `20` | Messages of context remembered per user |
| `RATE_LIMIT_MAX` | `3` | Max AI requests per window |
| `RATE_LIMIT_WINDOW_MS` | `10000` | Rate limit window in milliseconds |

---

## 📬 Support

Found a bug or have a suggestion? [Open an Issue](../../issues) and I'll look into it!

---

*Made with ❤️ by adi*
