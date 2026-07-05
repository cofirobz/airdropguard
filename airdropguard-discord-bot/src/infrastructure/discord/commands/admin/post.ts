import { ChannelType, SlashCommandBuilder } from "discord.js";
import { BotCommand } from "../../../../types/command";
import { BotServices } from "../../BotServices";
import { projectSummaryEmbed } from "../utils";

export const createPostCommand = (services: BotServices): BotCommand => ({
  data: new SlashCommandBuilder()
    .setName("post")
    .setDescription("Post a project summary")
    .addStringOption((option) => option.setName("project").setDescription("Project name").setRequired(true)),
  adminOnly: true,
  async execute({ interaction }) {
    await interaction.deferReply({ ephemeral: true });
    const project = interaction.options.getString("project", true);
    const result = await services.queryService.search(project);

    if (!result) {
      await interaction.editReply(`No data found for \"${project}\".`);
      return;
    }

    if (!services.channels.airdrops) {
      await interaction.editReply("Airdrops channel is not configured.");
      return;
    }

    const channel = await services.client.channels.fetch(services.channels.airdrops).catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildText) {
      await interaction.editReply("Airdrops channel is not configured correctly.");
      return;
    }

    await channel.send({ embeds: [projectSummaryEmbed(result)] });
    await interaction.editReply("Post published to airdrops channel.");
  }
});
