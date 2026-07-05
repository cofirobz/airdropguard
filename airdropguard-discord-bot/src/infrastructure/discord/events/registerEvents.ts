import { ChannelType, Events, GuildMember, TextChannel } from "discord.js";
import { logger } from "../../../core/logger/logger";
import { createCommands } from "../commandRegistry";
import { CUSTOM_IDS } from "../constants";
import { toCommandMap } from "../commandRegistry";
import { BotServices } from "../BotServices";

const sendLog = async (services: BotServices, content: string): Promise<void> => {
  if (!services.channels.logs) {
    return;
  }

  const channel = await services.client.channels.fetch(services.channels.logs).catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildText) {
    return;
  }
  await (channel as TextChannel).send(content).catch(() => undefined);
};

export const registerEvents = (services: BotServices): void => {
  const commands = toCommandMap(createCommands(services));

  services.client.on(Events.ClientReady, (client) => {
    logger.info("Discord client ready", {
      tag: client.user.tag,
      guildCount: client.guilds.cache.size
    });
    void sendLog(services, `AirdropGuard AI online as ${client.user.tag}`);
    services.automation.start();
  });

  services.client.on(Events.InteractionCreate, (interaction) => {
    void (async () => {
      if (interaction.isButton()) {
        if (!interaction.inGuild()) {
          await interaction.reply({ content: "This action only works in a server.", ephemeral: true });
          return;
        }

        if (interaction.customId === CUSTOM_IDS.verifyMember) {
          await interaction.reply({
            content: "Verification is temporarily disabled while the bot runs in slash-command-only mode.",
            ephemeral: true
          });
          return;
        }

        if (interaction.customId === CUSTOM_IDS.ticketOpen) {
          const channelMention = await services.ticketService.openTicket(interaction.guild!, interaction.user.id);
          await interaction.reply({ content: `Ticket opened: ${channelMention}`, ephemeral: true });
          return;
        }

        if (interaction.customId === CUSTOM_IDS.ticketClose) {
          if (!interaction.channel || !interaction.channel.isTextBased()) {
            await interaction.reply({ content: "This is not a text channel.", ephemeral: true });
            return;
          }
          await interaction.reply({ content: "Closing ticket...", ephemeral: true });
          await services.ticketService.closeTicket(interaction.channel);
        }

        return;
      }

      if (!interaction.isChatInputCommand()) {
        return;
      }

      const hit = services.interactionLimiter.hit(`${interaction.guildId ?? "dm"}:${interaction.user.id}`);
      if (!hit.allowed) {
        await interaction.reply({
          content: `Rate limit reached. Try again in ${Math.ceil(hit.retryAfterMs / 1000)} seconds.`,
          ephemeral: true
        });
        return;
      }

      const command = commands.get(interaction.commandName);
      if (!command) {
        await interaction.reply({ content: "Unknown command.", ephemeral: true });
        return;
      }

      if (command.adminOnly) {
        const ok = await services.permissions.ensureAdmin(interaction);
        if (!ok) {
          return;
        }
      }

      if (command.moderatorOnly) {
        const ok = await services.permissions.ensureModerator(interaction);
        if (!ok) {
          return;
        }
      }

      await command.execute({ interaction });
      await sendLog(services, `/${interaction.commandName} executed by ${interaction.user.tag}`);
    })().catch(async (error: unknown) => {
      logger.error("Interaction handler failed", error);

      const message = "Something went wrong while processing that command.";
      if (interaction.isRepliable()) {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({ content: message, ephemeral: true }).catch(() => undefined);
        } else {
          await interaction.reply({ content: message, ephemeral: true }).catch(() => undefined);
        }
      }

      await sendLog(services, `Interaction error: ${String(error)}`);
    });
  });
};
