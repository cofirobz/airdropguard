import { GuildMember, SlashCommandBuilder, User } from "discord.js";
import { BotCommand } from "../../../../types/command";

const allowedActions = ["warn", "timeout", "kick", "ban"] as const;
type ModAction = (typeof allowedActions)[number];

export const createModerateCommand = (): BotCommand => ({
  data: new SlashCommandBuilder()
    .setName("moderate")
    .setDescription("Moderation actions")
    .addUserOption((option) => option.setName("user").setDescription("Target user").setRequired(true))
    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription("Action")
        .setRequired(true)
        .addChoices(...allowedActions.map((action) => ({ name: action, value: action })))
    )
    .addIntegerOption((option) =>
      option.setName("minutes").setDescription("Timeout duration (minutes), for timeout action only")
    )
    .addStringOption((option) => option.setName("reason").setDescription("Reason").setRequired(false)),
  moderatorOnly: true,
  async execute({ interaction }) {
    await interaction.deferReply({ ephemeral: true });
    const target = interaction.options.getUser("user", true);
    const action = interaction.options.getString("action", true) as ModAction;
    const minutes = interaction.options.getInteger("minutes") ?? 15;
    const reason = interaction.options.getString("reason") ?? "Actioned by moderator";

    if (!interaction.guild) {
      await interaction.editReply("This command only works in a server.");
      return;
    }

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      await interaction.editReply("Member not found.");
      return;
    }

    await executeAction(action, member, target, reason, minutes);
    await interaction.editReply(`Action executed: ${action} -> ${target.tag}`);
  }
});

const executeAction = async (
  action: ModAction,
  member: GuildMember,
  user: User,
  reason: string,
  minutes: number
): Promise<void> => {
  if (action === "warn") {
    await user.send(`You have received a warning in ${member.guild.name}: ${reason}`).catch(() => undefined);
    return;
  }

  if (action === "timeout") {
    await member.timeout(minutes * 60 * 1000, reason);
    return;
  }

  if (action === "kick") {
    await member.kick(reason);
    return;
  }

  await member.ban({ reason });
};
