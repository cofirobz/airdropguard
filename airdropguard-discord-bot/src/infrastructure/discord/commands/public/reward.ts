import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { BotCommand } from "../../../../types/command";
import { BotServices } from "../../BotServices";
import { notFoundMessage } from "../utils";

export const createRewardCommand = (services: BotServices): BotCommand => ({
  data: new SlashCommandBuilder()
    .setName("reward")
    .setDescription("Estimated reward")
    .addStringOption((option) => option.setName("project").setDescription("Project name").setRequired(true)),
  async execute({ interaction }) {
    await interaction.deferReply();
    const project = interaction.options.getString("project", true);
    const result = await services.queryService.reward(project);
    if (!result) {
      await interaction.editReply(notFoundMessage(project));
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle(`Estimated Reward: ${result.name}`)
      .setDescription(result.estimatedReward ?? "Estimated reward not published yet")
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
});
