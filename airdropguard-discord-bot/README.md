# AirdropGuard AI Discord Bot

Check Before You Connect.

Production-ready Discord bot for AirdropGuard.com built with Discord.js v14 and TypeScript.

## What this bot does

- Welcomes new members
- Supports verification via one-click button
- Auto-assigns baseline roles on join
- Blocks known scam domains
- Detects spam and repeated-message abuse
- Provides private ticket support channels
- Logs command activity and runtime errors
- Includes moderation slash command set
- Provides an AI security assistant powered by OpenAI
- Integrates with AirdropGuard API through isolated adapter layer
- Auto-publishes latest verified airdrops, scam alerts, and website updates

## Tech stack

- Node.js 20+
- TypeScript
- Discord.js v14
- OpenAI SDK
- Axios
- Node-cron
- Zod

## Project structure

```text
src/
  application/
    ports/
    services/
  core/
    config/
    logger/
    security/
  domain/
    models/
  infrastructure/
    ai/
    api/
    discord/
      automation/
      commands/
      events/
      moderation/
      tickets/
      verification/
  types/
```

## Environment variables

Copy .env.example to .env and fill every required value.

Required:

- DISCORD_TOKEN
- DISCORD_CLIENT_ID
- OPENAI_API_KEY
- AIRDROPGUARD_API_BASE_URL
- VERIFIED_ROLE_ID
- ADMIN_ROLE_ID
- MODERATOR_ROLE_ID
- FOUNDER_ROLE_ID
- WELCOME_CHANNEL_ID
- LOG_CHANNEL_ID
- ALERTS_CHANNEL_ID
- AIRDROPS_CHANNEL_ID
- UPDATES_CHANNEL_ID
- TICKET_SUPPORT_ROLE_ID

Optional but recommended:

- DISCORD_GUILD_ID
- AIRDROPGUARD_API_KEY
- BOT_OWNER_USER_ID
- PREMIUM_ROLE_ID
- TICKET_CATEGORY_ID
- AUTO_ASSIGN_ROLE_IDS
- SCAM_DOMAIN_BLACKLIST
- AUTOMATION_POLL_CRON
- OPENAI_MODEL

## Discord setup checklist

1. Create a Discord application and bot in Discord Developer Portal.
2. Enable privileged intents:
   - Server Members Intent
   - Message Content Intent
3. Invite bot with scopes:
   - bot
   - applications.commands
4. Grant bot permissions:
   - Manage Roles
   - Manage Channels
   - Moderate Members
   - Kick Members
   - Ban Members
   - Send Messages
   - Read Message History
   - Embed Links
5. Create roles in your server:
   - Founder
   - Admin
   - Moderator
   - Verified
   - Premium (optional)
6. Add role and channel IDs into .env.

## Install and run

```bash
npm install
npm run build
npm run start
```

For development:

```bash
npm run dev
```

To register slash commands manually:

```bash
npm run register:commands
```

## Slash commands

Public:

- /latest
- /search <project>
- /scam <project>
- /trustscore <project>
- /reward <project>
- /tasks <project>
- /ask <question>
- /help

Support and moderation:

- /ticket
- /moderate

Admin:

- /announce
- /post
- /publish
- /addairdrop
- /removeairdrop

## AI safety policy

AirdropGuard AI is configured to:

- Answer crypto safety questions
- Explain wallet hygiene and scam prevention
- Explain trust score logic
- Refuse financial advice and investment recommendations

## API adapter design

The AirdropGuard API integration lives in:

- src/application/ports/AirdropApiPort.ts
- src/infrastructure/api/AirdropGuardApiClient.ts

This keeps API calls isolated from command logic so endpoint contracts can be swapped with minimal impact.

## Automation behavior

Cron-driven background automation posts to configured channels:

- Latest verified airdrops
- Scam alerts
- Website updates

Cron expression is controlled by AUTOMATION_POLL_CRON.

## Security controls

- Interaction rate limiting
- Message anti-spam with temporary timeout enforcement
- Scam domain blacklist checks
- Role-based access control for admin/moderator commands
- Structured runtime logging to console and Discord log channel
- Full secret handling via environment variables only

## Docker

Build and run:

```bash
docker build -t airdropguard-bot .
docker run --env-file .env --name airdropguard-bot --restart unless-stopped airdropguard-bot
```

Or with Compose:

```bash
docker compose up -d --build
```

## GitHub Actions deployment

Workflow file in this repository:

- .github/workflows/airdropguard-bot-deploy.yml

Pipeline stages:

1. Build and typecheck
2. Build and push Docker image to GHCR
3. Deploy to VPS through SSH (when SSH secrets are configured)

Required repository secrets for deployment stage:

- SSH_HOST
- SSH_USER
- SSH_PRIVATE_KEY

## Production hardening recommendations

- Restrict bot role hierarchy below Founder/Admin roles.
- Keep admin command usage in locked staff channels.
- Use Discord announcement channels for /publish crossposting.
- Rotate API and OpenAI keys regularly.
- Monitor LOG_CHANNEL_ID for abuse patterns and API failures.
- Consider adding Redis-backed distributed rate limiting when sharding.

## License

Private internal use for AirdropGuard.
