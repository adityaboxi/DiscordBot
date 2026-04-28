# 🤖 adiBot

A smart Discord bot powered by **Grok AI (xAI)** that can chat, answer questions, shorten URLs, and help manage your server.

---

## ✨ Features

| Feature | Description |
|--------|-------------|
| 💬 **AI Chat** | Ask anything and get intelligent replies powered by Grok AI |
| 🔗 **URL Shortener** | Shorten any long URL instantly via `/create` |
| 🗑️ **Chat Cleaner** | Bulk-delete messages with `!delete chat` or `/delete-chat` |
| ⚡ **Instant Replies** | Fast responses for common greetings and commands |
| 🧠 **Memory** | Remembers conversation context per user |
| 🏓 **Ping Command** | Check bot latency with `/ping` |

---

## ➕ Add adiBot to Your Server

👉 **[Click here to invite adiBot](#)**

---

## 🆕 New to Discord? Start Here!

### Step 1 — Create a Discord Account
1. Go to [https://discord.com](https://discord.com)
2. Click **"Open Discord in your browser"** or download the app
3. Click **"Register"** and fill in your email, username, password, and date of birth
4. Verify your email by clicking the link Discord sends you

### Step 2 — Create Your Own Server
1. After logging in, look at the left sidebar
2. Click the ➕ at the bottom of the server list
3. Choose **"Create My Own"** → **"For me and my friends"**
4. Give your server a name and click **"Create"**

✅ You now have your own Discord server!

### Step 3 — Add adiBot to Your Server
1. Click the invite link: 👉 **[Add adiBot](#)**
2. Under **"Add to Server"**, select your server
3. Click **"Continue"** → review permissions → click **"Authorize"**
4. Complete the CAPTCHA if asked

🎉 adiBot is now in your server!

### Step 4 — Start Chatting with adiBot

Open any text channel and try these:

| Message | Response |
|--------|----------|
| `hello` / `hi` / `hey` | Friendly greeting reply |
| `name?` | Bot tells you its name |
| `!ask <question>` | AI-powered reply from Grok |
| `/ask <question>` | Same as above via slash command |
| `/create <url>` | Shortens a URL via TinyURL |
| `!delete chat` | Clears the channel (admin only) |
| `/delete-chat` | Same as above via slash command |
| `/ping` | Responds with 🏓 Pong! + latency |

---

## 🔒 Permissions Explained

| Permission | Why it needs it |
|-----------|----------------|
| Read Messages | To see what you type |
| Send Messages | To reply to you |
| Manage Messages | To delete chat when asked |
| Use Slash Commands | For `/ping`, `/ask`, `/create`, `/delete-chat` |

---

## 🛠️ Tech Stack

- **[Discord.js](https://discord.js.org/)** — Discord API wrapper
- **[Grok AI (xAI)](https://x.ai/)** — AI model powering responses
- **[OpenAI SDK](https://www.npmjs.com/package/openai)** — Used as the xAI-compatible API client
- **[TinyURL API](https://tinyurl.com/)** — URL shortening
- **[Node.js](https://nodejs.org/)** — Runtime environment
- **[nodemon](https://nodemon.io/)** — Dev auto-restart

---

## 🚀 Self-Hosting

```bash
# 1. Clone the repo
git clone https://github.com/your-username/adibot.git
cd adibot

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Fill in DISCORD_TOKEN, CLIENT_ID, and XAI_API_KEY

# 4. Deploy slash commands (one time only)
node deploy.js

# 5. Start the bot
npm run dev
```

### `.env` format
```env
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_application_client_id
XAI_API_KEY=your_xai_api_key
```

---

## 📬 Support

Having issues? [Open an Issue](../../issues) on this repo and I'll look into it!

---

*Made with ❤️ by adi*
