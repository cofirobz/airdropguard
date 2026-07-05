import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { BotCommand } from "../../../../types/command";
import { BotServices } from "../../BotServices";
import { notFoundMessage } from "../utils";

export const createTasksCommand = (services: BotServices): BotCommand => ({
  data: new SlashCommandBuilder()
    .setName("tasks")
    .setDescription("Required tasks")
    .addStringOption((option) => option.setName("project").setDescription("Project name").setRequired(true)),
  async execute({ interaction }) {
    await interaction.deferReply();
    const project = interaction.options.getString("project", true);
    const result = await services.queryService.tasks(project);
    if (!result) {
      await interaction.editReply(notFoundMessage(project));
      return;
    }

    const taskList = result.tasks.length > 0 ? result.tasks.map((task, idx) => `${idx + 1}. ${task}`).join("\n") : "No task list available.";

    const embed = new EmbedBuilder()
      .setColor(0x95a5a6)
      .setTitle(`Required Tasks: ${result.name}`)
      .setDescription(taskList)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
});
