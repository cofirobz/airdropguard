import {
  ChannelType,
  EmbedBuilder,
  Guild,
  GuildBasedChannel,
  Message,
  NewsChannel,
  SlashCommandBuilder,
  TextChannel
} from "discord.js";
import { BotCommand } from "../../../../types/command";

type TargetKey = "welcome" | "rules" | "verification" | "announcements";

interface TargetSpec {
  key: TargetKey;
  required: boolean;
  aliases: string[];
  marker: string;
  title: string;
  buildEmbed: () => EmbedBuilder;
}

const BRAND = "AirdropGuard";
const TAGLINE = "Check Before You Connect.";

const normalizeName = (value: string): string =>
  value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

const findChannel = (guild: Guild, aliases: string[]): GuildBasedChannel | undefined => {
  const aliasSet = new Set(aliases.map((alias) => normalizeName(alias)));
  return guild.channels.cache.find((channel) => {
    const isTextLike = channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement;
    return isTextLike && aliasSet.has(normalizeName(channel.name));
  });
};

const isWritableGuildChannel = (channel: GuildBasedChannel): channel is TextChannel | NewsChannel =>
  channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement;

const buildWelcomeEmbed = (): EmbedBuilder =>
  new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("Welcome to AirdropGuard Premium")
    .setDescription(
      [
        "You are inside an AI-first security platform built to help you verify opportunities and avoid scams.",
        "",
        "Start in 60 seconds:",
        "1. Read rules in #📜-rules",
        "2. Complete verification in #✅-get-verified",
        "3. Track live intelligence in #🚨-threat-alerts and #🧭-verified-airdrops",
        "4. Ask the assistant in #🤖-ask-ai"
      ].join("\n")
    )
    .addFields(
      {
        name: "New to Crypto?",
        value: "Start with #🧠-learn-security for beginner-safe guidance.",
        inline: false
      },
      {
        name: "Need Help?",
        value: "Open a private request in #🎫-create-ticket.",
        inline: false
      }
    )
    .setFooter({ text: `${BRAND} | ${TAGLINE} | AG-WELCOME` })
    .setTimestamp();

const buildRulesEmbed = (): EmbedBuilder =>
  new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("AirdropGuard Server Rules")
    .setDescription("These rules keep the community professional, safe and high-signal.")
    .addFields(
      {
        name: "Community Standards",
        value: [
          "• Respect all members. No harassment or hate speech.",
          "• Keep discussions on-topic per channel.",
          "• No unsolicited DMs, spam, or referral farming.",
          "• No fake performance claims or fabricated proof posts."
        ].join("\n")
      },
      {
        name: "Security Standards",
        value: [
          "• No phishing links, drainer links, or impersonation.",
          "• Never share seed phrases or private keys.",
          "• Report suspicious activity in #threat-alerts or to staff.",
          "• Staff safety decisions are final during active incidents."
        ].join("\n")
      },
      {
        name: "Disclaimer",
        value: "All content is educational and does not constitute financial advice."
      }
    )
    .setFooter({ text: `${BRAND} | ${TAGLINE} | AG-RULES` })
    .setTimestamp();

const buildVerificationEmbed = (): EmbedBuilder =>
  new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("Verification & Onboarding")
    .setDescription("Complete verification to unlock all member channels.")
    .addFields(
      {
        name: "Step 1",
        value: "Confirm you understand basic wallet safety and anti-scam practices.",
        inline: false
      },
      {
        name: "Step 2",
        value: "Acknowledge that you will never share private keys or seed phrases.",
        inline: false
      },
      {
        name: "Step 3",
        value: "Once verified, read #threat-alerts and start in #ask-copilot.",
        inline: false
      }
    )
    .setFooter({ text: `${BRAND} | ${TAGLINE} | AG-VERIFY` })
    .setTimestamp();

const buildAnnouncementEmbed = (): EmbedBuilder =>
  new EmbedBuilder()
    .setColor(0xf5c451)
    .setTitle("AirdropGuard Platform Overview")
    .setDescription("A premium AI security platform for safer airdrop participation.")
    .addFields(
      {
        name: "What You Get",
        value: [
          "• Live scam intelligence and threat updates",
          "• Verified airdrop listings with trust context",
          "• AI-powered analysis for faster decisions",
          "• Beginner-safe education and support"
        ].join("\n")
      },
      {
        name: "Core Spaces",
        value: "#🚨-threat-alerts | #🧭-verified-airdrops | #🤖-ask-ai | #🔍-ai-analysis"
      },
      {
        name: "Website",
        value: "https://airdropguard.com"
      }
    )
    .setFooter({ text: `${BRAND} | ${TAGLINE} | AG-ANNOUNCE` })
    .setTimestamp();

const TARGETS: TargetSpec[] = [
  {
    key: "welcome",
    required: true,
    aliases: ["welcome-lobby", "👋-welcome", "welcome", "👋│welcome"],
    marker: "AG-WELCOME",
    title: "welcome",
    buildEmbed: buildWelcomeEmbed
  },
  {
    key: "rules",
    required: true,
    aliases: ["rules-and-safety", "📜-rules", "rules", "📜│rules"],
    marker: "AG-RULES",
    title: "rules",
    buildEmbed: buildRulesEmbed
  },
  {
    key: "verification",
    required: true,
    aliases: ["verify-here", "✅-get-verified", "get-verified", "✅│get-verified"],
    marker: "AG-VERIFY",
    title: "verification",
    buildEmbed: buildVerificationEmbed
  },
  {
    key: "announcements",
    required: true,
    aliases: ["platform-news", "📣-announcements", "announcements", "📣│announcements"],
    marker: "AG-ANNOUNCE",
    title: "announcements",
    buildEmbed: buildAnnouncementEmbed
  }
];

const findExistingBotMessage = async (
  channel: TextChannel | NewsChannel,
  botUserId: string,
  marker: string
): Promise<Message | undefined> => {
  const messages = await channel.messages.fetch({ limit: 100 });
  return messages.find((message) => {
    if (message.author.id !== botUserId) {
      return false;
    }

    return message.embeds.some((embed) => embed.footer?.text?.includes(marker));
  });
};

export const createPostBrandWelcomeCommand = (): BotCommand => ({
  data: new SlashCommandBuilder()
    .setName("post-brand-welcome")
    .setDescription("Post or update AirdropGuard branded welcome, rules and onboarding embeds"),
  adminOnly: true,
  async execute({ interaction }) {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({ content: "This command only works in a server.", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const botUserId = interaction.client.user?.id;
    if (!botUserId) {
      await interaction.editReply("Bot user context is unavailable right now.");
      return;
    }

    const created: string[] = [];
    const updated: string[] = [];
    const skippedOptional: string[] = [];
    const missingRequired: string[] = [];

    for (const target of TARGETS) {
      const channel = findChannel(guild, target.aliases);
      if (!channel || !isWritableGuildChannel(channel)) {
        if (target.required) {
          missingRequired.push(target.title);
        } else {
          skippedOptional.push(target.title);
        }
        continue;
      }

      const embed = target.buildEmbed();
      const existing = await findExistingBotMessage(channel, botUserId, target.marker).catch(() => undefined);

      if (existing) {
        await existing.edit({ embeds: [embed] });
        updated.push(target.title);
      } else {
        await channel.send({ embeds: [embed] });
        created.push(target.title);
      }
    }

    await interaction.editReply(
      [
        "AirdropGuard branded channel posts synced.",
        `Created: ${created.length > 0 ? created.join(", ") : "none"}`,
        `Updated: ${updated.length > 0 ? updated.join(", ") : "none"}`,
        `Optional skipped: ${skippedOptional.length > 0 ? skippedOptional.join(", ") : "none"}`,
        `Missing required channels: ${missingRequired.length > 0 ? missingRequired.join(", ") : "none"}`
      ].join("\n")
    );
  }
});
