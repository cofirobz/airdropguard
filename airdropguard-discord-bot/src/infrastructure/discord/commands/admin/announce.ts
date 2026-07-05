import { ChannelType, SlashCommandBuilder } from "discord.js";
import { BotCommand } from "../../../../types/command";
import { BotServices } from "../../BotServices";

export const createAnnounceCommand = (services: BotServices): BotCommand => ({
  data: new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Send an announcement")
    .addStringOption((option) => option.setName("message").setDescription("Announcement text").setRequired(true)),
  adminOnly: true,
  async execute({ interaction }) {
    const message = interaction.options.getString("message", true);
    if (!services.channels.alerts) {
      await interaction.reply({ content: "Alerts channel is not configured.", ephemeral: true });
      return;
    }

    const channel = await services.client.channels.fetch(services.channels.alerts).catch(() => null);

    if (!channel || channel.type !== ChannelType.GuildText) {
      await interaction.reply({ content: "Alerts channel is not configured correctly.", ephemeral: true });
      return;
    }

    await channel.send({ content: `@everyone ${message}` });
    await interaction.reply({ content: "Announcement sent.", ephemeral: true });
  }
});
