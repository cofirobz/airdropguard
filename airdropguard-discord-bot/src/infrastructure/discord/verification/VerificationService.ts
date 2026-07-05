import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  GuildMember,
  TextChannel
} from "discord.js";
import { CUSTOM_IDS } from "../constants";
import { logger } from "../../../core/logger/logger";

export class VerificationService {
  public constructor(
    private readonly client: Client,
    private readonly welcomeChannelId: string,
    private readonly verifiedRoleId: string,
    private readonly autoAssignRoles: string[]
  ) {}

  public async onMemberJoined(member: GuildMember): Promise<void> {
    for (const roleId of this.autoAssignRoles) {
      if (member.guild.roles.cache.has(roleId)) {
        await member.roles.add(roleId).catch(() => undefined);
      }
    }

    const channel = await this.client.channels.fetch(this.welcomeChannelId).catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildText) {
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x00a67e)
      .setTitle("Welcome to AirdropGuard AI")
      .setDescription(
        `Hey ${member}, welcome to **AirdropGuard AI**.\n\nClick **Verify** to unlock protected channels and scam alerts.\n\n**Check Before You Connect.**`
      )
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(CUSTOM_IDS.verifyMember).setLabel("Verify").setStyle(ButtonStyle.Success)
    );

    await (channel as TextChannel).send({ embeds: [embed], components: [row] });
  }

  public async verifyMember(member: GuildMember): Promise<boolean> {
    if (member.roles.cache.has(this.verifiedRoleId)) {
      return false;
    }

    await member.roles.add(this.verifiedRoleId);
    logger.info("Member verified", { guildId: member.guild.id, userId: member.id });
    return true;
  }
}
