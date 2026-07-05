import { REST, Routes, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder } from "discord.js";
import { BotCommand } from "../../types/command";
import { BotServices } from "./BotServices";
import { createAddAirdropCommand } from "./commands/admin/addairdrop";
import { createAnnounceCommand } from "./commands/admin/announce";
import { createPostCommand } from "./commands/admin/post";
import { createPublishCommand } from "./commands/admin/publish";
import { createRemoveAirdropCommand } from "./commands/admin/removeairdrop";
import { createModerateCommand } from "./commands/moderation/moderate";
import { createAskCommand } from "./commands/public/ask";
import { createHelpCommand } from "./commands/public/help";
import { createLatestCommand } from "./commands/public/latest";
import { createRewardCommand } from "./commands/public/reward";
import { createScamCommand } from "./commands/public/scam";
import { createSearchCommand } from "./commands/public/search";
import { createTasksCommand } from "./commands/public/tasks";
import { createTicketCommand } from "./commands/public/ticket";
import { createTrustScoreCommand } from "./commands/public/trustscore";

export const createCommands = (services: BotServices): BotCommand[] => [
  createLatestCommand(services),
  createSearchCommand(services),
  createScamCommand(services),
  createTrustScoreCommand(services),
  createRewardCommand(services),
  createTasksCommand(services),
  createAskCommand(services),
  createHelpCommand(),
  createTicketCommand(services),
  createAnnounceCommand(services),
  createPostCommand(services),
  createPublishCommand(services),
  createAddAirdropCommand(services),
  createRemoveAirdropCommand(services),
  createModerateCommand()
];

export const toCommandMap = (commands: BotCommand[]): Map<string, BotCommand> =>
  new Map(commands.map((command) => [command.data.name, command]));

export const registerCommands = async (args: {
  token: string;
  clientId: string;
  guildId?: string;
  commands: Array<SlashCommandBuilder | SlashCommandOptionsOnlyBuilder>;
}): Promise<void> => {
  const rest = new REST({ version: "10" }).setToken(args.token);
  const body = args.commands.map((command) => command.toJSON());

  if (args.guildId) {
    await rest.put(Routes.applicationGuildCommands(args.clientId, args.guildId), { body });
    return;
  }

  await rest.put(Routes.applicationCommands(args.clientId), { body });
};
