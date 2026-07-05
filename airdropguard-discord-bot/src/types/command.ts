import { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder } from "discord.js";

export interface CommandContext {
  interaction: ChatInputCommandInteraction;
}

export interface BotCommand {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute(ctx: CommandContext): Promise<void>;
  adminOnly?: boolean;
  moderatorOnly?: boolean;
}
