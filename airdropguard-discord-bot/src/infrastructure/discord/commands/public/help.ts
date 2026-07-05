import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { BotCommand } from "../../../../types/command";

export const createHelpCommand = (): BotCommand => ({
  data: new SlashCommandBuilder().setName("help").setDescription("List commands"),
  async execute({ interaction }) {
    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("AirdropGuard AI Commands")
      .setDescription("Check Before You Connect.")
      .addFields(
        {
          name: "Public",
          value:
            "`/latest` `/search` `/scam` `/trustscore` `/reward` `/tasks` `/ask` `/help`"
        },
        {
          name: "Support",
          value: "`/ticket`"
        },
        {
          name: "Admin",
          value: "`/announce` `/post` `/publish` `/addairdrop` `/removeairdrop` `/moderate`"
        }
      )
      .setFooter({ text: "AirdropGuard AI Security Assistant" });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
});
