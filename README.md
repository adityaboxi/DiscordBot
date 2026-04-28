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
| `!clear` | Bulk-delete messages *(requires Manage Messages)* |
| `!delete chat` | Same as `!clear` |

### Slash Commands

| Command | Description |
|--------|-------------|
| `/ask <question>` | Ask Grok AI anything |
| `/create <url>` | Shorten a URL via TinyURL |
| `/ping` | Check bot + API latency |
| `/delete-chat [amount]` | Delete 1–100 messages *(requires Manage Messages)* |

---

## ➕ Add adiBot to Your Server

👉 **[Click here to invite adiBot](https://discord.com/oauth2/authorize?client_id=1478646599084408853&permissions=76800&scope=bot+applications.commands)**

---

## 🆕 New to Discord? Start Here

Never used Discord before? No worries — follow these steps!

---

### Step 1 — Create a Discord Account
1. Go to [discord.com](https://discord.com)
2. Click **"Open Discord in your browser"** or download the app
3. Click **Register** and fill in your:
   - Email address
   - Username *(your display name)*
   - Password
   - Date of birth
4. Click **Continue**
5. Verify your email by clicking the link Discord sends you

---

### Step 2 — Download Discord *(Optional but recommended)*
- **PC / Mac** → [discord.com/download](https://discord.com/download)
- **iPhone** → App Store → search **"Discord"**
- **Android** → Play Store → search **"Discord"**
- Or just use it in your **browser** — no download needed

---

### Step 3 — Create Your Own Server
1. After logging in, look at the left sidebar
2. Click the **➕** icon at the bottom of the server list
3. Choose **"Create My Own"**
4. Choose **"For me and my friends"**
5. Give your server a name and click **Create**

✅ You now have your own Discord server!

---

### Step 4 — Add adiBot to Your Server
1. Click this link 👉 **[Add adiBot](https://discord.com/oauth2/authorize?client_id=1478646599084408853&permissions=76800&scope=bot+applications.commands)**
2. Log in to Discord if prompted
3. Under **"Add to Server"** select the server you just created
4. Click **Continue**
5. Review the permissions and click **Authorize**
6. Complete the CAPTCHA if asked

🎉 adiBot is now in your server!

---

### Step 5 — Enable Developer Mode *(for slash commands)*
1. Click the ⚙️ **Settings** icon near your username *(bottom left)*
2. Go to **App Settings** → **Advanced**
3. Toggle **Developer Mode** ON
4. Close settings

---

### Step 6 — Start Chatting with adiBot
1. Open your server and click any text channel *(e.g. **#general**)*
2. Type a message and hit **Enter** — adiBot will reply!

**Try these to get started:**

| What to type | What happens |
|-------------|--------------|
| `hello` | adiBot greets you back 👋 |
| `name?` | adiBot introduces itself 🤖 |
| `!ask what can you do?` | AI-powered reply from Grok |
| `/ping` | Bot replies with latency 🏓 |
| `!clear` | Deletes messages *(admin only)* |

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

Tweak these values at the top of `index.js`:

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
