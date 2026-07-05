import { GuildMember, Message } from "discord.js";
import { SlidingWindowLimiter } from "../../../core/security/rateLimiter";
import { logger } from "../../../core/logger/logger";

export class AutoModerationService {
  private readonly repeatedMessages = new Map<string, { hash: string; count: number }>();

  public constructor(
    private readonly limiter: SlidingWindowLimiter,
    private readonly mutedSeconds: number,
    private readonly blockedDomains: string[]
  ) {}

  public containsBlockedDomain(content: string): string | null {
    const lowered = content.toLowerCase();
    for (const domain of this.blockedDomains) {
      if (lowered.includes(domain)) {
        return domain;
      }
    }
    return null;
  }

  public async moderateMessage(message: Message): Promise<void> {
    if (!message.inGuild() || message.author.bot) {
      return;
    }

    const blockedDomain = this.containsBlockedDomain(message.content);
    if (blockedDomain) {
      await message.delete().catch(() => undefined);
      if (message.channel.isSendable()) {
        await message.channel
          .send({
            content: `<@${message.author.id}> your message was removed because it matched a known scam domain (${blockedDomain}).`
          })
          .catch(() => undefined);
      }
      logger.warn("Blocked scam domain in message", {
        userId: message.author.id,
        guildId: message.guildId,
        blockedDomain
      });
      return;
    }

    const limit = this.limiter.hit(`${message.guildId}:${message.author.id}`);
    if (!limit.allowed) {
      await this.applySpamTimeout(message.member, message);
      return;
    }

    await this.handleRepeatedMessages(message);
  }

  private async handleRepeatedMessages(message: Message): Promise<void> {
    const key = `${message.guildId}:${message.author.id}`;
    const contentHash = message.content.trim().toLowerCase();
    const previous = this.repeatedMessages.get(key);

    if (!contentHash || contentHash.length < 6) {
      return;
    }

    if (previous?.hash === contentHash) {
      const nextCount = previous.count + 1;
      this.repeatedMessages.set(key, { hash: contentHash, count: nextCount });
      if (nextCount >= 4) {
        await this.applySpamTimeout(message.member, message);
      }
      return;
    }

    this.repeatedMessages.set(key, { hash: contentHash, count: 1 });
  }

  private async applySpamTimeout(member: GuildMember | null, message: Message): Promise<void> {
    if (!member?.moderatable) {
      return;
    }

    await member.timeout(this.mutedSeconds * 1000, "Anti-spam rule triggered").catch(() => undefined);
    if (message.channel.isSendable()) {
      await message.channel
        .send({
          content: `<@${member.id}> was timed out for spam for ${Math.round(this.mutedSeconds / 60)} minutes.`
        })
        .catch(() => undefined);
    }

    logger.warn("Member timed out for spam", {
      userId: member.id,
      guildId: message.guildId,
      mutedSeconds: this.mutedSeconds
    });
  }
}
