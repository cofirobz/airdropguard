import { ChannelType, NewsChannel, SlashCommandBuilder } from "discord.js";
import { BotCommand } from "../../../../types/command";
import { BotServices } from "../../BotServices";

export const createPublishCommand = (services: BotServices): BotCommand => ({
  data: new SlashCommandBuilder()
    .setName("publish")
    .setDescription("Crosspost an announcement message")
    .addStringOption((option) => option.setName("messageid").setDescription("Message ID to crosspost").setRequired(true))
    .addStringOption((option) =>
      option
        .setName("channelid")
        .setDescription("Channel ID (defaults to alerts channel)")
        .setRequired(false)
    ),
  adminOnly: true,
  async execute({ interaction }) {
    await interaction.deferReply({ ephemeral: true });
    const messageId = interaction.options.getString("messageid", true);
    const channelId = interaction.options.getString("channelid") ?? services.channels.alerts;
    const channel = await services.client.channels.fetch(channelId).catch(() => null);

    if (!channel || channel.type !== ChannelType.GuildAnnouncement) {
      await interaction.editReply("Target channel must be an announcement channel.");
      return;
    }

    const fetched = await (channel as NewsChannel).messages.fetch(messageId).catch(() => null);
    if (!fetched) {
      await interaction.editReply("Message not found in the selected announcement channel.");
      return;
    }

    await fetched.crosspost();
    await interaction.editReply("Message published to followers.");
  }
});
