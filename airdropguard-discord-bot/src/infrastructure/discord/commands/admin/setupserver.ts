import {
  CategoryChannel,
  ChannelType,
  DiscordAPIError,
  Guild,
  GuildBasedChannel,
  NewsChannel,
  GuildTextBasedChannel,
  PermissionFlagsBits,
  PermissionsBitField,
  Role,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import { logger, serializeError } from "../../../../core/logger/logger";
import { BotCommand } from "../../../../types/command";

type RoleKey =
  | "founder"
  | "admin"
  | "securityLead"
  | "moderator"
  | "support"
  | "aiAnalyst"
  | "premium"
  | "verified"
  | "newcomer"
  | "bots";

type ChannelPolicy = "publicReadonly" | "verifiedChat" | "premiumOnly" | "staffOnly" | "ticketEntry";

class SetupActionError extends Error {
  public constructor(
    public readonly action: string,
    public readonly status: number | undefined,
    public readonly code: string | number | undefined,
    public readonly discordMessage: string | undefined,
    public readonly method: string | undefined,
    public readonly url: string | undefined,
    public readonly cause: unknown
  ) {
    super(discordMessage ?? `Failed action: ${action}`);
    this.name = "SetupActionError";
  }
}

interface SetupServerSummary {
  createdRoles: string[];
  updatedRoles: string[];
  createdCategories: string[];
  createdChannels: string[];
  updatedChannels: string[];
  skippedRoleEdits: string[];
  skippedRoleReorders: string[];
}

interface RoleSpec {
  key: RoleKey;
  name: string;
  aliases: string[];
  color: number;
  permissions: bigint[];
}

interface ChannelSpec {
  name: string;
  aliases: string[];
  topic: string;
  policy: ChannelPolicy;
}

interface CategorySpec {
  name: string;
  aliases: string[];
  channels: ChannelSpec[];
}

const ROLE_SPECS: RoleSpec[] = [
  {
    key: "founder",
    name: "AG Founder",
    aliases: ["Founder", "Owner"],
    color: 0xf5c451,
    permissions: [PermissionFlagsBits.Administrator]
  },
  {
    key: "admin",
    name: "AG Admin",
    aliases: ["Admin"],
    color: 0xe24e4e,
    permissions: [PermissionFlagsBits.Administrator]
  },
  {
    key: "securityLead",
    name: "Threat Intel Lead",
    aliases: ["Security Lead", "Security"],
    color: 0xff6b6b,
    permissions: [
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.ManageRoles,
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.ModerateMembers,
      PermissionFlagsBits.ViewAuditLog
    ]
  },
  {
    key: "moderator",
    name: "Moderator",
    aliases: ["Mod"],
    color: 0x4e8cff,
    permissions: [
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.ModerateMembers,
      PermissionFlagsBits.KickMembers,
      PermissionFlagsBits.ViewAuditLog
    ]
  },
  {
    key: "support",
    name: "Concierge",
    aliases: ["Support"],
    color: 0x38b2ac,
    permissions: [PermissionFlagsBits.ManageMessages]
  },
  {
    key: "aiAnalyst",
    name: "Intelligence Analyst",
    aliases: ["AI Analyst", "Analyst"],
    color: 0x7c83fd,
    permissions: [PermissionFlagsBits.ManageMessages]
  },
  {
    key: "premium",
    name: "Premium Member",
    aliases: ["Premium", "VIP"],
    color: 0xb794f4,
    permissions: []
  },
  {
    key: "verified",
    name: "Verified",
    aliases: ["Verified Member"],
    color: 0x8aa0b8,
    permissions: []
  },
  {
    key: "newcomer",
    name: "Visitor",
    aliases: ["Newcomer"],
    color: 0x6b7280,
    permissions: []
  },
  {
    key: "bots",
    name: "Automation",
    aliases: ["Bots", "Bot"],
    color: 0x4b5563,
    permissions: []
  }
];

const CATEGORY_SPECS: CategorySpec[] = [
  {
    name: "01 | Welcome Desk",
    aliases: ["🚀 Start Here", "Start Here"],
    channels: [
      {
        name: "👋-welcome",
        aliases: ["👋-welcome", "welcome-lobby", "welcome", "👋│welcome"],
        topic: "Premium entry point: what AirdropGuard is, what members get, and where to start fast.",
        policy: "publicReadonly"
      },
      {
        name: "✅-get-verified",
        aliases: ["✅-get-verified", "verify-here", "get-verified", "✅│get-verified"],
        topic: "Access gate for verified membership and full server unlock.",
        policy: "publicReadonly"
      },
      {
        name: "📣-announcements",
        aliases: ["📣-announcements", "platform-news", "announcements", "📣│announcements"],
        topic: "Official product updates, release notes, and governance notices.",
        policy: "publicReadonly"
      },
      {
        name: "📜-rules",
        aliases: ["📜-rules", "rules", "📜│rules"],
        topic: "Server standards and safety requirements.",
        policy: "publicReadonly"
      }
    ]
  },
  {
    name: "02 | Intelligence Hub",
    aliases: ["🛡️ Intelligence Feed", "Intelligence Feed"],
    channels: [
      {
        name: "🚨-threat-alerts",
        aliases: ["🚨-threat-alerts", "threat-alerts", "🚨-scam-alerts", "scam-alerts", "🚨│scam-alerts"],
        topic: "High-signal scam warnings, impersonation alerts, wallet-risk advisories.",
        policy: "verifiedChat"
      },
      {
        name: "🧭-verified-airdrops",
        aliases: ["🧭-verified-airdrops", "verified-airdrops", "🧭│verified-airdrops", "verified-drops"],
        topic: "Published and reviewed opportunities only, no hype noise.",
        policy: "verifiedChat"
      },
      {
        name: "📊-market-signals",
        aliases: ["📊-market-signals", "market-signals", "📊│market-signals"],
        topic: "Daily risk sentiment, ecosystem watchlist, trust shifts.",
        policy: "verifiedChat"
      }
    ]
  },
  {
    name: "03 | AI Copilot",
    aliases: ["🤖 AI Security Desk", "AI Security Desk"],
    channels: [
      {
        name: "🤖-ask-ai",
        aliases: ["🤖-ask-ai", "ask-copilot", "ask-ai", "🤖│ask-ai"],
        topic: "Use AI assistant for quick project checks and wallet safety questions.",
        policy: "verifiedChat"
      },
      {
        name: "🔍-ai-analysis",
        aliases: ["🔍-ai-analysis", "deep-analysis", "ai-analysis", "🔍│ai-analysis"],
        topic: "Deeper AI breakdowns, trust components, evidence-based commentary.",
        policy: "verifiedChat"
      }
    ]
  },
  {
    name: "04 | Community Lounge",
    aliases: ["💬 Community", "Community"],
    channels: [
      {
        name: "💬-general",
        aliases: ["💬-general", "member-lounge", "general", "💬│general"],
        topic: "Clean discussion space for members and newcomers.",
        policy: "verifiedChat"
      },
      {
        name: "🧠-learn-security",
        aliases: ["🧠-learn-security", "learn-security", "🧠│learn-security"],
        topic: "Beginner-friendly explainers, anti-scam education, wallet hygiene.",
        policy: "verifiedChat"
      },
      {
        name: "🏆-reward-showcase",
        aliases: ["🏆-reward-showcase", "reward-showcase", "🏆│reward-showcase"],
        topic: "Member wins, claimed rewards, verified progress snapshots.",
        policy: "verifiedChat"
      }
    ]
  },
  {
    name: "05 | Member Support",
    aliases: ["🆘 Support", "Support"],
    channels: [
      {
        name: "🎫-create-ticket",
        aliases: ["🎫-create-ticket", "open-ticket", "create-ticket", "🎫│create-ticket"],
        topic: "Open private support tickets for account, billing, and access issues.",
        policy: "ticketEntry"
      },
      {
        name: "❓-faq",
        aliases: ["❓-faq", "help-faq", "faq", "❓│faq"],
        topic: "Short answers to common questions and quick troubleshooting.",
        policy: "publicReadonly"
      }
    ]
  },
  {
    name: "06 | Premium Suite",
    aliases: ["💎 Premium", "Premium"],
    channels: [
      {
        name: "premium-briefings",
        aliases: ["💎-premium-briefings", "premium-briefings", "💎│premium-briefings"],
        topic: "Curated high-conviction opportunity briefings and risk memos.",
        policy: "premiumOnly"
      },
      {
        name: "premium-lounge",
        aliases: ["🔐-premium-lounge", "premium-lounge", "🔐│premium-lounge"],
        topic: "Premium member discussion and concierge-style support.",
        policy: "premiumOnly"
      },
      {
        name: "🛰️-request-research",
        aliases: ["🛰️-request-research", "request-research", "alpha-requests"],
        topic: "Premium queue for project due-diligence and custom intelligence requests.",
        policy: "premiumOnly"
      }
    ]
  },
  {
    name: "07 | Staff Operations",
    aliases: ["🧱 Staff Ops", "Staff Ops"],
    channels: [
      {
        name: "🛡️-mod-chat",
        aliases: ["🛡️-mod-chat", "mod-command", "mod-chat", "🛡️│mod-chat"],
        topic: "Moderation coordination and routine decisions.",
        policy: "staffOnly"
      },
      {
        name: "🚫-incident-room",
        aliases: ["🚫-incident-room", "incident-room", "🚫│incident-room"],
        topic: "Live scam and abuse incidents, escalation-only channel.",
        policy: "staffOnly"
      },
      {
        name: "🗂️-content-ops",
        aliases: ["🗂️-content-ops", "content-ops", "🗂️│content-ops"],
        topic: "Announcement drafting, feed scheduling, weekly planning.",
        policy: "staffOnly"
      },
      {
        name: "⚙️-bot-control",
        aliases: ["⚙️-bot-control", "automation-control", "bot-control", "⚙️│bot-control"],
        topic: "Automation status, command logs, operational checks.",
        policy: "staffOnly"
      }
    ]
  }
];

const ROLE_ORDER: RoleKey[] = [
  "newcomer",
  "verified",
  "premium",
  "aiAnalyst",
  "support",
  "moderator",
  "securityLead",
  "admin",
  "founder",
  "bots"
];

const STAFF_ROLE_KEYS: RoleKey[] = ["support", "moderator", "securityLead", "admin", "founder", "bots"];

const allow = (...permissions: bigint[]) => ({ allow: permissions, deny: [] as bigint[] });
const deny = (...permissions: bigint[]) => ({ allow: [] as bigint[], deny: permissions });

const findRole = (guild: Guild, names: string[]): Role | undefined =>
  guild.roles.cache.find((role) => names.includes(role.name));

const findChannel = (guild: Guild, names: string[], parentId?: string): GuildBasedChannel | undefined =>
  guild.channels.cache.find((channel) => {
    if (!names.includes(channel.name)) {
      return false;
    }
    if (!parentId) {
      return true;
    }
    return "parentId" in channel && channel.parentId === parentId;
  });

const isTextChannel = (channel: GuildBasedChannel): channel is GuildTextBasedChannel & GuildBasedChannel =>
  channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement;

const isConfigurableChannel = (channel: GuildBasedChannel): channel is TextChannel | NewsChannel =>
  channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement;

const getDiscordErrorMeta = (error: unknown): {
  status?: number;
  code?: string | number;
  discordMessage?: string;
  method?: string;
  url?: string;
} => {
  if (error instanceof DiscordAPIError) {
    return {
      status: error.status,
      code: error.code,
      discordMessage: error.message,
      method: error.method,
      url: error.url
    };
  }

  if (typeof error !== "object" || error === null) {
    return {};
  }

  const raw = error as Record<string, unknown>;
  const rawError = typeof raw.rawError === "object" && raw.rawError !== null
    ? raw.rawError as Record<string, unknown>
    : undefined;

  return {
    status: typeof raw.status === "number" ? raw.status : undefined,
    code: typeof raw.code === "number" || typeof raw.code === "string" ? raw.code : undefined,
    discordMessage:
      typeof raw.message === "string"
        ? raw.message
        : typeof rawError?.message === "string"
          ? rawError.message
          : undefined,
    method: typeof raw.method === "string" ? raw.method : undefined,
    url: typeof raw.url === "string" ? raw.url : undefined
  };
};

const formatReason = (error: unknown): string => {
  if (error instanceof SetupActionError) {
    return [
      `action=${error.action}`,
      error.status ? `status=${error.status}` : undefined,
      error.code !== undefined ? `code=${String(error.code)}` : undefined,
      error.discordMessage ? `message=${error.discordMessage}` : undefined
    ].filter(Boolean).join(" | ");
  }

  const d = getDiscordErrorMeta(error);
  const status = d.status ? `status=${d.status}` : undefined;
  const code = d.code !== undefined ? `code=${String(d.code)}` : undefined;
  const message = d.discordMessage ? `message=${d.discordMessage}` : undefined;
  return [status, code, message].filter(Boolean).join(" | ") || "unknown reason";
};

const executeAction = async <T>(action: string, run: () => Promise<T>): Promise<T> => {
  logger.info("setup-server action starting", { action });
  try {
    return await run();
  } catch (error) {
    const d = getDiscordErrorMeta(error);
    logger.error("setup-server action failed", {
      action,
      ...serializeError(error),
      ...d
    });
    throw new SetupActionError(action, d.status, d.code, d.discordMessage, d.method, d.url, error);
  }
};

export const runSetupServer = async (guild: Guild): Promise<SetupServerSummary> => {
  const me = await executeAction("Fetch bot member", () => guild.members.fetchMe());

  const requiredBotPermissions = [
    { name: "Manage Roles", bit: PermissionFlagsBits.ManageRoles },
    { name: "Manage Channels", bit: PermissionFlagsBits.ManageChannels },
    { name: "View Channels", bit: PermissionFlagsBits.ViewChannel },
    { name: "Send Messages", bit: PermissionFlagsBits.SendMessages }
  ];

  const missingPermissions = requiredBotPermissions
    .filter((p) => !me.permissions.has(p.bit))
    .map((p) => p.name);

  if (missingPermissions.length > 0) {
    throw new SetupActionError(
      "Check bot permissions",
      undefined,
      "MISSING_BOT_PERMISSIONS",
      `Missing: ${missingPermissions.join(", ")}`,
      undefined,
      undefined,
      null
    );
  }

  const createdRoles: string[] = [];
  const updatedRoles: string[] = [];
  const createdCategories: string[] = [];
  const createdChannels: string[] = [];
  const updatedChannels: string[] = [];
  const skippedRoleEdits: string[] = [];
  const skippedRoleReorders: string[] = [];
  const roleMap = {} as Record<RoleKey, Role>;
  const botHighestRolePosition = me.roles.highest.position;

  for (const spec of ROLE_SPECS) {
    const names = [spec.name, ...spec.aliases];
    const existing = findRole(guild, names);
    const permissions = new PermissionsBitField(spec.permissions);

    if (!existing) {
      const created = await executeAction(`Create role: ${spec.name}`, () =>
        guild.roles.create({
          name: spec.name,
          color: spec.color,
          permissions,
          reason: "AirdropGuard /setup-server role provision"
        })
      );
      roleMap[spec.key] = created;
      createdRoles.push(spec.name);
    } else {
      roleMap[spec.key] = existing;
      if (!existing.editable) {
        skippedRoleEdits.push(`${spec.name} (${existing.id})`);
        continue;
      }

      await executeAction(`Edit role: ${spec.name}`, () =>
        existing.edit({
          name: spec.name,
          color: spec.color,
          permissions,
          reason: "AirdropGuard /setup-server role sync"
        })
      );
      updatedRoles.push(spec.name);
    }
  }

  for (let index = 0; index < ROLE_ORDER.length; index += 1) {
    const role = roleMap[ROLE_ORDER[index]];
    if (!role || role.managed) {
      continue;
    }

    const targetPosition = index + 1;
    if (!role.editable || role.position >= botHighestRolePosition || targetPosition >= botHighestRolePosition) {
      skippedRoleReorders.push(`${role.name} (${role.id})`);
      continue;
    }

    await executeAction(`Set role position: ${role.name}`, () =>
      role.setPosition(index + 1, { reason: "AirdropGuard /setup-server role hierarchy sync" })
    );
  }

  for (const [categoryIndex, categorySpec] of CATEGORY_SPECS.entries()) {
    const categoryNames = [categorySpec.name, ...categorySpec.aliases];
    let category = findChannel(guild, categoryNames) as CategoryChannel | undefined;

    if (!category || category.type !== ChannelType.GuildCategory) {
      category = await executeAction(`Create category: ${categorySpec.name}`, () =>
        guild.channels.create({
          name: categorySpec.name,
          type: ChannelType.GuildCategory,
          position: categoryIndex,
          reason: "AirdropGuard /setup-server category provision"
        })
      );
      createdCategories.push(categorySpec.name);
    } else if (category.name !== categorySpec.name) {
      await executeAction<void>(`Edit category: ${categorySpec.name}`, async () => {
        await category!.edit({ name: categorySpec.name, reason: "AirdropGuard /setup-server category rename" });
      });
    }

    if (!category) {
      continue;
    }

    for (const channelSpec of categorySpec.channels) {
      const names = [channelSpec.name, ...channelSpec.aliases];
      let channel = findChannel(guild, names, category.id);

      if (!channel) {
        channel = findChannel(guild, names);
      }

      if (!channel) {
        const created = await executeAction(`Create channel: ${channelSpec.name}`, () =>
          guild.channels.create({
            name: channelSpec.name,
            type: ChannelType.GuildText,
            parent: category.id,
            topic: channelSpec.topic,
            reason: "AirdropGuard /setup-server channel provision"
          })
        );
        createdChannels.push(channelSpec.name);
        channel = created;
      }

      // If a channel already exists but is not text/announcement (for example a forum),
      // preserve it in place to avoid creating a duplicate channel with the same purpose.
      if (channel && !isConfigurableChannel(channel)) {
        continue;
      }

      if (!isConfigurableChannel(channel)) {
        continue;
      }

      const nextParent = "parentId" in channel ? channel.parentId : null;
      const shouldUpdate =
        channel.name !== channelSpec.name ||
        nextParent !== category.id ||
        ("topic" in channel ? channel.topic !== channelSpec.topic : false);

      if (shouldUpdate) {
        await executeAction<void>(`Edit channel: ${channelSpec.name}`, async () => {
          await channel.edit({
            name: channelSpec.name,
            parent: category.id,
            topic: channelSpec.topic,
            reason: "AirdropGuard /setup-server channel sync"
          });
        });
        updatedChannels.push(channelSpec.name);
      }

      const overwrites = buildPolicyOverwrites(guild, roleMap, channelSpec.policy);
      await executeAction(`Set permissions: ${channelSpec.name}`, () =>
        channel.permissionOverwrites.set(overwrites, "AirdropGuard /setup-server permission sync")
      );

      if (channelSpec.policy === "verifiedChat" && channel.name.includes("general") && "setRateLimitPerUser" in channel) {
        await executeAction<void>(`Set slowmode: ${channelSpec.name}`, async () => {
          await channel.setRateLimitPerUser(10, "AirdropGuard /setup-server slowmode");
        });
      }
    }
  }

  return {
    createdRoles,
    updatedRoles,
    createdCategories,
    createdChannels,
    updatedChannels,
    skippedRoleEdits,
    skippedRoleReorders
  };
};

const buildPolicyOverwrites = (
  guild: Guild,
  roleMap: Record<RoleKey, Role>,
  policy: ChannelPolicy
) => {
  const everyone = guild.roles.everyone;
  const overwrites: Array<{ id: string; allow?: bigint[]; deny?: bigint[] }> = [];

  const grantViewRead = (role: Role) =>
    overwrites.push({
      id: role.id,
      ...allow(PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory)
    });

  const grantChat = (role: Role) =>
    overwrites.push({
      id: role.id,
      ...allow(
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.AddReactions
      )
    });

  const grantStaffPost = (role: Role) =>
    overwrites.push({
      id: role.id,
      ...allow(
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageMessages
      )
    });

  if (policy === "publicReadonly") {
    overwrites.push({
      id: everyone.id,
      ...allow(PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory),
      deny: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AddReactions,
        PermissionFlagsBits.CreatePublicThreads,
        PermissionFlagsBits.CreatePrivateThreads
      ]
    });

    for (const key of STAFF_ROLE_KEYS) {
      grantStaffPost(roleMap[key]);
    }
    return overwrites;
  }

  if (policy === "verifiedChat" || policy === "ticketEntry") {
    overwrites.push({ id: everyone.id, ...deny(PermissionFlagsBits.ViewChannel) });
    grantChat(roleMap.verified);
    grantChat(roleMap.premium);
    for (const key of STAFF_ROLE_KEYS) {
      grantStaffPost(roleMap[key]);
    }
    return overwrites;
  }

  if (policy === "premiumOnly") {
    overwrites.push({ id: everyone.id, ...deny(PermissionFlagsBits.ViewChannel) });
    grantChat(roleMap.premium);
    for (const key of STAFF_ROLE_KEYS) {
      grantStaffPost(roleMap[key]);
    }
    return overwrites;
  }

  overwrites.push({ id: everyone.id, ...deny(PermissionFlagsBits.ViewChannel) });
  for (const key of STAFF_ROLE_KEYS) {
    grantStaffPost(roleMap[key]);
  }
  return overwrites;
};

export const createSetupServerCommand = (): BotCommand => ({
  data: new SlashCommandBuilder()
    .setName("setup-server")
    .setDescription("Create and sync AirdropGuard server roles, categories, channels and permissions"),
  adminOnly: true,
  async execute({ interaction }) {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({ content: "This command only works in a server.", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    try {
      const summary = await runSetupServer(guild);

      await interaction.editReply([
        "AirdropGuard server setup synced.",
        `Roles created: ${summary.createdRoles.length} | roles updated: ${summary.updatedRoles.length}`,
        `Categories created: ${summary.createdCategories.length}`,
        `Channels created: ${summary.createdChannels.length} | channels updated: ${summary.updatedChannels.length}`,
        `Role edits skipped (hierarchy/permissions): ${summary.skippedRoleEdits.length}`,
        `Role reorders skipped (hierarchy/permissions): ${summary.skippedRoleReorders.length}`,
        "Safe to run again: existing resources were updated in place and not duplicated."
      ].join("\n"));
    } catch (error) {
      const serialized = serializeError(error);
      const discordMeta = getDiscordErrorMeta(error);

      logger.error("setup-server command failed", {
        ...serialized,
        ...discordMeta,
        guildId: guild.id,
        channelId: interaction.channelId,
        userId: interaction.user.id
      });

      await interaction.editReply([
        "AirdropGuard setup failed.",
        `Reason: ${formatReason(error)}`,
        `Failed action: ${error instanceof SetupActionError ? error.action : "Unknown action"}`,
        "Created so far: roles=see logs, categories=see logs, channels=see logs",
        "Skipped role edits/reorders: see logs",
        "Check bot role position and required permissions, then rerun /setup-server."
      ].join("\n"));
    }
  }
});