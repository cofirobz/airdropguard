import { SlashCommandBuilder } from "discord.js";
import { BotCommand } from "../../../../types/command";
import { BotServices } from "../../BotServices";

export const createRemoveAirdropCommand = (services: BotServices): BotCommand => ({
  data: new SlashCommandBuilder()
    .setName("removeairdrop")
    .setDescription("Remove an airdrop from AirdropGuard")
    .addStringOption((option) => option.setName("project").setDescription("Project name").setRequired(true)),
  adminOnly: true,
  async execute({ interaction }) {
    await interaction.deferReply({ ephemeral: true });
    const project = interaction.options.getString("project", true);
    await services.queryService.removeProject(project);
    await interaction.editReply(`Project \"${project}\" removed.`);
  }
});
