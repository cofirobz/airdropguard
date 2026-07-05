import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  Guild,
  GuildTextBasedChannel,
  OverwriteResolvable,
  PermissionFlagsBits
} from "discord.js";
import { CUSTOM_IDS } from "../constants";

export class TicketService {
  public constructor(
    private readonly client: Client,
    private readonly supportRoleId: string,
    private readonly categoryId?: string
  ) {}

  public async postPanel(channel: GuildTextBasedChannel): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(0x1f8b4c)
      .setTitle("AirdropGuard Support")
      .setDescription("Need help with scam checks, trust scores, or suspicious campaigns? Open a private ticket.")
      .setFooter({ text: "AirdropGuard AI | Check Before You Connect." });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(CUSTOM_IDS.ticketOpen).setLabel("Open Ticket").setStyle(ButtonStyle.Primary)
    );

    await channel.send({ embeds: [embed], components: [row] });
  }

  public async openTicket(guild: Guild, userId: string): Promise<string> {
    const existing = guild.channels.cache.find(
      (channel) =>
        channel.type === ChannelType.GuildText &&
        channel.name === `ticket-${userId}` &&
        channel.permissionsFor(userId)?.has(PermissionFlagsBits.ViewChannel)
    );

    if (existing) {
      return `<#${existing.id}>`;
    }

    const permissionOverwrites: OverwriteResolvable[] = [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: userId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      },
      {
        id: this.supportRoleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      }
    ];

    const created = await guild.channels.create({
      name: `ticket-${userId}`,
      type: ChannelType.GuildText,
      parent: this.categoryId,
      permissionOverwrites
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(CUSTOM_IDS.ticketClose).setLabel("Close Ticket").setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setTitle("Ticket Created")
      .setDescription(`<@${userId}> support is on the way. Please share details about your issue.`)
      .setColor(0x2b2d31);

    await created.send({
      content: `<@${userId}> <@&${this.supportRoleId}>`,
      embeds: [embed],
      components: [row]
    });

    return `<#${created.id}>`;
  }

  public async closeTicket(channel: GuildTextBasedChannel): Promise<void> {
    await channel.send("Closing ticket in 5 seconds...");
    setTimeout(() => {
      void channel.delete("Ticket closed by support action");
    }, 5000);
  }
}
