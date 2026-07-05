import { SlashCommandBuilder } from "discord.js";
import { BotCommand } from "../../../../types/command";
import { BotServices } from "../../BotServices";
import { projectSummaryEmbed } from "../utils";

export const createLatestCommand = (services: BotServices): BotCommand => ({
  data: new SlashCommandBuilder()
    .setName("latest")
    .setDescription("Show latest verified airdrops")
    .addIntegerOption((option) =>
      option.setName("limit").setDescription("Number of projects to show (1-10)").setMinValue(1).setMaxValue(10)
    ),
  async execute({ interaction }) {
    await interaction.deferReply();
    const limit = interaction.options.getInteger("limit") ?? 5;
    const latest = await services.queryService.latest(limit);
    if (latest.length === 0) {
      await interaction.editReply("No verified airdrops were returned by the API.");
      return;
    }

    await interaction.editReply({
      content: "Latest verified airdrops:",
      embeds: latest.map((project) => projectSummaryEmbed(project))
    });
  }
});
