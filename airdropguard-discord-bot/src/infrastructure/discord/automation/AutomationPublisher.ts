import { ChannelType, Client, EmbedBuilder, TextChannel } from "discord.js";
import cron from "node-cron";
import { AirdropApiPort } from "../../../application/ports/AirdropApiPort";
import { logger, serializeError } from "../../../core/logger/logger";

interface AutomationChannels {
  airdropsChannelId?: string;
  alertsChannelId?: string;
  updatesChannelId?: string;
}

export class AutomationPublisher {
  private latestAirdropPoll?: string;
  private latestAlertPoll?: string;
  private latestUpdatePoll?: string;
  private airdropsEnabled = true;
  private alertsEnabled = true;
  private updatesEnabled = true;

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
        this.fetchAirdrops(),
        this.fetchAlerts(),
        this.fetchUpdates()
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
      logger.error("Automation run failed", serializeError(error));
    }
  }

  private async fetchAirdrops() {
    return this.fetchAutomationFeed({
      enabled: this.airdropsEnabled,
      endpointPath: "/airdrops/latest",
      automationName: "verified airdrops",
      disable: () => {
        this.airdropsEnabled = false;
      },
      run: () => this.api.getLatestVerified(3)
    });
  }

  private async fetchAlerts() {
    return this.fetchAutomationFeed({
      enabled: this.alertsEnabled,
      endpointPath: "/alerts/scams",
      automationName: "scam alerts",
      disable: () => {
        this.alertsEnabled = false;
      },
      run: () => this.api.getScamAlertsSince(this.latestAlertPoll)
    });
  }

  private async fetchUpdates() {
    return this.fetchAutomationFeed({
      enabled: this.updatesEnabled,
      endpointPath: "/updates",
      automationName: "website updates",
      disable: () => {
        this.updatesEnabled = false;
      },
      run: () => this.api.getWebsiteUpdatesSince(this.latestUpdatePoll)
    });
  }

  private async fetchAutomationFeed<T>(args: {
    enabled: boolean;
    endpointPath: string;
    automationName: string;
    disable: () => void;
    run: () => Promise<T[]>;
  }): Promise<T[]> {
    if (!args.enabled) {
      return [];
    }

    try {
      return await args.run();
    } catch (error) {
      const status = this.getStatusCode(error);

      if (status === 404) {
        args.disable();
        logger.warn("Automation endpoint unavailable; disabling automation", {
          automation: args.automationName,
          endpointPath: args.endpointPath,
          status
        });
        return [];
      }

      logger.warn("Automation endpoint request failed", {
        automation: args.automationName,
        endpointPath: args.endpointPath,
        status,
        ...serializeError(error)
      });
      return [];
    }
  }

  private getStatusCode(error: unknown): number | undefined {
    if (typeof error !== "object" || error === null) {
      return undefined;
    }

    const response = "response" in error ? error.response : undefined;
    if (typeof response !== "object" || response === null) {
      return undefined;
    }

    return "status" in response && typeof response.status === "number" ? response.status : undefined;
  }

  private async postEmbed(channelId: string | undefined, embed: EmbedBuilder): Promise<void> {
    if (!channelId) {
      return;
    }

    const channel = await this.client.channels.fetch(channelId).catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildText) {
      return;
    }

    await (channel as TextChannel).send({ embeds: [embed] });
  }
}
