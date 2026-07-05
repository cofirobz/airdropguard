import { ChannelType, SlashCommandBuilder } from "discord.js";
import { BotCommand } from "../../../../types/command";
import { BotServices } from "../../BotServices";

export const createTicketCommand = (services: BotServices): BotCommand => ({
  data: new SlashCommandBuilder().setName("ticket").setDescription("Post ticket support panel"),
  moderatorOnly: true,
  async execute({ interaction }) {
    if (!interaction.channel || interaction.channel.type !== ChannelType.GuildText) {
      await interaction.reply({ content: "Use this command in a text channel.", ephemeral: true });
      return;
    }

    await services.ticketService.postPanel(interaction.channel);
    await interaction.reply({ content: "Ticket panel posted.", ephemeral: true });
  }
});
