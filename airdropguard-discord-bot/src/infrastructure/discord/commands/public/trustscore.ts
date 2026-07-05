import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { BotCommand } from "../../../../types/command";
import { BotServices } from "../../BotServices";
import { notFoundMessage } from "../utils";

export const createTrustScoreCommand = (services: BotServices): BotCommand => ({
  data: new SlashCommandBuilder()
    .setName("trustscore")
    .setDescription("Explain trust score and scoring breakdown")
    .addStringOption((option) => option.setName("project").setDescription("Project name").setRequired(true)),
  async execute({ interaction }) {
    await interaction.deferReply();
    const project = interaction.options.getString("project", true);
    const result = await services.queryService.trustScore(project);
    if (!result) {
      await interaction.editReply(notFoundMessage(project));
      return;
    }

    const b = result.trustScoreBreakdown;
    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`Trust Score: ${result.name}`)
      .setDescription("AirdropGuard trust score model breakdown")
      .addFields(
        { name: "Overall", value: `${result.trustScore}/100`, inline: false },
        { name: "Team", value: `${b.team}/20`, inline: true },
        { name: "Security", value: `${b.security}/20`, inline: true },
        { name: "Tokenomics", value: `${b.tokenomics}/20`, inline: true },
        { name: "Community", value: `${b.community}/20`, inline: true },
        { name: "Transparency", value: `${b.transparency}/20`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
});
