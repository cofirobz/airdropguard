import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { BotCommand } from "../../../../types/command";
import { BotServices } from "../../BotServices";
import { notFoundMessage } from "../utils";

export const createScamCommand = (services: BotServices): BotCommand => ({
  data: new SlashCommandBuilder()
    .setName("scam")
    .setDescription("Explain why a project is flagged")
    .addStringOption((option) => option.setName("project").setDescription("Project name").setRequired(true)),
  async execute({ interaction }) {
    await interaction.deferReply();
    const project = interaction.options.getString("project", true);
    const result = await services.queryService.scam(project);

    if (!result) {
      await interaction.editReply(notFoundMessage(project));
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(result.flaggedScam ? 0xed4245 : 0x57f287)
      .setTitle(`Scam Analysis: ${result.name}`)
      .setDescription(
        result.flaggedScam
          ? "This project is currently flagged by AirdropGuard."
          : "This project is not currently flagged as a scam."
      )
      .addFields({
        name: "Reasons",
        value: result.scamReasons.length > 0 ? result.scamReasons.map((v) => `- ${v}`).join("\n") : "No active scam reasons"
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
});
