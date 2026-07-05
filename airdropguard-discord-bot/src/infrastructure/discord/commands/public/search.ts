import { SlashCommandBuilder } from "discord.js";
import { BotCommand } from "../../../../types/command";
import { BotServices } from "../../BotServices";
import { notFoundMessage, projectSummaryEmbed } from "../utils";

export const createSearchCommand = (services: BotServices): BotCommand => ({
  data: new SlashCommandBuilder()
    .setName("search")
    .setDescription("Analyse a project stored in AirdropGuard")
    .addStringOption((option) => option.setName("project").setDescription("Project name").setRequired(true)),
  async execute({ interaction }) {
    await interaction.deferReply();
    const project = interaction.options.getString("project", true);
    const result = await services.queryService.search(project);
    if (!result) {
      await interaction.editReply(notFoundMessage(project));
      return;
    }

    await interaction.editReply({ embeds: [projectSummaryEmbed(result)] });
  }
});
