import { AirdropQueryService } from "./application/services/AirdropQueryService";
import { env } from "./core/config/env";
import { logger } from "./core/logger/logger";
import { PermissionGuard } from "./core/security/permissions";
import { SlidingWindowLimiter } from "./core/security/rateLimiter";
import { AirdropGuardApiClient } from "./infrastructure/api/AirdropGuardApiClient";
import { OpenAiAssistant } from "./infrastructure/ai/OpenAiAssistant";
import { AutomationPublisher } from "./infrastructure/discord/automation/AutomationPublisher";
import { createDiscordClient } from "./infrastructure/discord/client";
import { createCommands, registerCommands } from "./infrastructure/discord/commandRegistry";
import { registerEvents } from "./infrastructure/discord/events/registerEvents";
import { AutoModerationService } from "./infrastructure/discord/moderation/AutoModerationService";
import { TicketService } from "./infrastructure/discord/tickets/TicketService";
import { VerificationService } from "./infrastructure/discord/verification/VerificationService";

const warnIfMissing = (name: string, feature: string, value: string | undefined): void => {
  if (!value) {
    logger.warn(`${feature} disabled because ${name} is not configured.`);
  }
};

export const bootstrap = async (): Promise<void> => {
  const client = createDiscordClient();
  const api = new AirdropGuardApiClient(env.AIRDROPGUARD_API_BASE_URL, env.AIRDROPGUARD_API_KEY);

  warnIfMissing("VERIFIED_ROLE_ID", "Verification role assignment", env.VERIFIED_ROLE_ID);
  warnIfMissing("WELCOME_CHANNEL_ID", "Welcome messages", env.WELCOME_CHANNEL_ID);
  warnIfMissing("ADMIN_ROLE_ID", "Admin role checks", env.ADMIN_ROLE_ID);
  warnIfMissing("MODERATOR_ROLE_ID", "Moderator role checks", env.MODERATOR_ROLE_ID);
  warnIfMissing("FOUNDER_ROLE_ID", "Founder role checks", env.FOUNDER_ROLE_ID);
  warnIfMissing("LOG_CHANNEL_ID", "Discord log channel output", env.LOG_CHANNEL_ID);
  warnIfMissing("ALERTS_CHANNEL_ID", "Alert publishing", env.ALERTS_CHANNEL_ID);
  warnIfMissing("AIRDROPS_CHANNEL_ID", "Airdrop publishing", env.AIRDROPS_CHANNEL_ID);
  warnIfMissing("UPDATES_CHANNEL_ID", "Website update publishing", env.UPDATES_CHANNEL_ID);
  warnIfMissing("TICKET_SUPPORT_ROLE_ID", "Ticket support", env.TICKET_SUPPORT_ROLE_ID);
  logger.warn("Member join verification disabled while running in slash-command-only mode.");
  logger.warn("Message content anti-spam and scam scanning disabled while running in slash-command-only mode.");

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

  registerEvents(services);

  logger.info("Registering slash commands", {
    routeType: env.ENABLE_GUILD_COMMANDS ? "guild" : "global",
    clientId: env.DISCORD_CLIENT_ID,
    guildId: env.ENABLE_GUILD_COMMANDS ? env.DISCORD_GUILD_ID : undefined
  });

  await registerCommands({
    token: env.DISCORD_TOKEN,
    clientId: env.DISCORD_CLIENT_ID,
    guildId: env.ENABLE_GUILD_COMMANDS ? env.DISCORD_GUILD_ID : undefined,
    commands: createCommands(services).map((command) => command.data)
  });

  logger.info("Slash commands registered successfully", {
    routeType: env.ENABLE_GUILD_COMMANDS ? "guild" : "global"
  });

  logger.info("Logging into Discord client");
  await client.login(env.DISCORD_TOKEN);
  logger.info("AirdropGuard AI bootstrapped");
};
