import { ChannelType, Client, EmbedBuilder, TextChannel } from "discord.js";
import cron from "node-cron";
import { AirdropApiPort } from "../../../application/ports/AirdropApiPort";
import { logger } from "../../../core/logger/logger";

interface AutomationChannels {
  airdropsChannelId: string;
  alertsChannelId: string;
  updatesChannelId: string;
}

export class AutomationPublisher {
  private latestAirdropPoll?: string;
  private latestAlertPoll?: string;
  private latestUpdatePoll?: string;

  public constructor(
    private readonly client: Client,
    private readonly api: AirdropApiPort,
    private readonly channels: AutomationChannels,
    private readonly schedule: string
  ) {}

  public start(): void {
    cron.schedule(this.schedule, () => {
      void this.runOnce();
    });

    void this.runOnce();
  }

  public async runOnce(): Promise<void> {
    try {
      const [airdrops, alerts, updates] = await Promise.all([
        this.api.getLatestVerified(3),
        this.api.getScamAlertsSince(this.latestAlertPoll),
        this.api.getWebsiteUpdatesSince(this.latestUpdatePoll)
      ]);

      if (airdrops.length > 0) {
        this.latestAirdropPoll = new Date().toISOString();
      }
      if (alerts.length > 0) {
        this.latestAlertPoll = new Date().toISOString();
      }
      if (updates.length > 0) {
        this.latestUpdatePoll = new Date().toISOString();
      }

      for (const airdrop of airdrops) {
        await this.postEmbed(this.channels.airdropsChannelId, new EmbedBuilder()
          .setTitle(`New Verified Airdrop: ${airdrop.name}`)
          .setColor(0x57f287)
          .setDescription(airdrop.summary ?? "Verified by AirdropGuard analysts.")
          .addFields(
            { name: "Trust Score", value: String(airdrop.trustScore), inline: true },
            { name: "Estimated Reward", value: airdrop.estimatedReward ?? "Not disclosed", inline: true }
          )
          .setURL(airdrop.website ?? "https://airdropguard.com")
          .setTimestamp());
      }

      for (const alert of alerts) {
        await this.postEmbed(this.channels.alertsChannelId, new EmbedBuilder()
          .setTitle(`Scam Alert: ${alert.projectName}`)
          .setColor(alert.severity === "critical" ? 0xed4245 : 0xfee75c)
          .setDescription(alert.reason)
          .setURL(alert.sourceUrl ?? "https://airdropguard.com/scam-alerts")
          .setFooter({ text: `Severity: ${alert.severity.toUpperCase()}` })
          .setTimestamp(new Date(alert.detectedAt)));
      }

      for (const update of updates) {
        await this.postEmbed(this.channels.updatesChannelId, new EmbedBuilder()
          .setTitle(`Website Update: ${update.title}`)
          .setColor(0x5865f2)
          .setDescription(update.details)
          .setURL(update.url)
          .setTimestamp(new Date(update.publishedAt)));
      }
    } catch (error) {
      logger.error("Automation run failed", error);
    }
  }

  private async postEmbed(channelId: string, embed: EmbedBuilder): Promise<void> {
    const channel = await this.client.channels.fetch(channelId).catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildText) {
      return;
    }

    await (channel as TextChannel).send({ embeds: [embed] });
  }
}
