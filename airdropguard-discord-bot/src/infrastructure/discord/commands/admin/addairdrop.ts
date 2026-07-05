import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { BotCommand } from "../../../../types/command";
import { BotServices } from "../../BotServices";

export const createAddAirdropCommand = (services: BotServices): BotCommand => ({
  data: new SlashCommandBuilder()
    .setName("addairdrop")
    .setDescription("Add a verified airdrop to AirdropGuard")
    .addStringOption((option) => option.setName("name").setDescription("Project name").setRequired(true))
    .addStringOption((option) => option.setName("website").setDescription("Official website").setRequired(true))
    .addStringOption((option) => option.setName("category").setDescription("Airdrop category").setRequired(true))
    .addStringOption((option) => option.setName("reward").setDescription("Estimated reward").setRequired(true))
    .addStringOption((option) =>
      option.setName("tasks").setDescription("Comma separated tasks").setRequired(true)
    )
    .addStringOption((option) => option.setName("summary").setDescription("Short summary").setRequired(true)),
  adminOnly: true,
  async execute({ interaction }) {
    await interaction.deferReply({ ephemeral: true });
    const tasks = interaction
      .options.getString("tasks", true)
      .split(",")
      .map((task) => task.trim())
      .filter(Boolean);

    const created = await services.queryService.addProject({
      name: interaction.options.getString("name", true),
      website: interaction.options.getString("website", true),
      category: interaction.options.getString("category", true),
      estimatedReward: interaction.options.getString("reward", true),
      tasks,
      summary: interaction.options.getString("summary", true)
    });

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("Airdrop Added")
      .setDescription(`${created.name} was added successfully.`)
      .setURL(created.website ?? "https://airdropguard.com")
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
});
