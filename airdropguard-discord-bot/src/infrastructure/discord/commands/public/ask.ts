import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { BotCommand } from "../../../../types/command";
import { BotServices } from "../../BotServices";

export const createAskCommand = (services: BotServices): BotCommand => ({
  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask AirdropGuard AI about wallet security and scam prevention")
    .addStringOption((option) => option.setName("question").setDescription("Your question").setRequired(true)),
  async execute({ interaction }) {
    await interaction.deferReply();
    const question = interaction.options.getString("question", true);
    const answer = await services.aiAssistant.answer(question);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("AirdropGuard AI")
      .setDescription(answer)
      .setFooter({ text: "Security guidance only. No financial advice." });

    await interaction.editReply({ embeds: [embed] });
  }
});
