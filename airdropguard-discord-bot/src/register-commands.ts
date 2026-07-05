import { AirdropQueryService } from "./application/services/AirdropQueryService";
import { env } from "./core/config/env";
import { PermissionGuard } from "./core/security/permissions";
import { SlidingWindowLimiter } from "./core/security/rateLimiter";
import { AirdropGuardApiClient } from "./infrastructure/api/AirdropGuardApiClient";
import { OpenAiAssistant } from "./infrastructure/ai/OpenAiAssistant";
import { AutomationPublisher } from "./infrastructure/discord/automation/AutomationPublisher";
import { createCommands, registerCommands } from "./infrastructure/discord/commandRegistry";
import { createDiscordClient } from "./infrastructure/discord/client";
import { AutoModerationService } from "./infrastructure/discord/moderation/AutoModerationService";
import { TicketService } from "./infrastructure/discord/tickets/TicketService";
import { VerificationService } from "./infrastructure/discord/verification/VerificationService";

const main = async (): Promise<void> => {
  const client = createDiscordClient();
  const api = new AirdropGuardApiClient(env.AIRDROPGUARD_API_BASE_URL, env.AIRDROPGUARD_API_KEY);

  const services = {
    client,
    api,
    queryService: new AirdropQueryService(api),
    permissions: new PermissionGuard({
      founderRoleId: env.FOUNDER_ROLE_ID,
      adminRoleId: env.ADMIN_ROLE_ID,
      moderatorRoleId: env.MODERATOR_ROLE_ID,
      verifiedRoleId: env.VERIFIED_ROLE_ID,
      premiumRoleId: env.PREMIUM_ROLE_ID,
      ownerUserId: env.BOT_OWNER_USER_ID
    }),
    aiAssistant: new OpenAiAssistant(env.OPENAI_API_KEY, env.OPENAI_MODEL),
    ticketService: new TicketService(client, env.TICKET_SUPPORT_ROLE_ID, env.TICKET_CATEGORY_ID),
    autoModeration: new AutoModerationService(
      new SlidingWindowLimiter(env.ANTI_SPAM_MAX_MESSAGES, env.ANTI_SPAM_WINDOW_MS),
      env.MUTE_SECONDS_FOR_SPAM,
      env.SCAM_DOMAIN_BLACKLIST
    ),
    verification: new VerificationService(client, env.WELCOME_CHANNEL_ID, env.VERIFIED_ROLE_ID, env.AUTO_ASSIGN_ROLE_IDS),
    automation: new AutomationPublisher(
      client,
      api,
      {
        airdropsChannelId: env.AIRDROPS_CHANNEL_ID,
        alertsChannelId: env.ALERTS_CHANNEL_ID,
        updatesChannelId: env.UPDATES_CHANNEL_ID
      },
      env.AUTOMATION_POLL_CRON
    ),
    interactionLimiter: new SlidingWindowLimiter(15, 60_000),
    channels: {
      airdrops: env.AIRDROPS_CHANNEL_ID,
      alerts: env.ALERTS_CHANNEL_ID,
      updates: env.UPDATES_CHANNEL_ID,
      logs: env.LOG_CHANNEL_ID
    }
  };

  await registerCommands({
    token: env.DISCORD_TOKEN,
    clientId: env.DISCORD_CLIENT_ID,
    guildId: env.ENABLE_GUILD_COMMANDS ? env.DISCORD_GUILD_ID : undefined,
    commands: createCommands(services).map((command) => command.data)
  });

  process.stdout.write("Slash commands registered.\n");
};

void main();
