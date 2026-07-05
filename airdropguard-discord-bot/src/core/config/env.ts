import { config as dotenvConfig } from "dotenv";
import { z } from "zod";

dotenvConfig();

const optionalString = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
  z.string().min(1).optional()
);

const splitCsv = (value: string | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_GUILD_ID: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  AIRDROPGUARD_API_BASE_URL: z.string().url(),
  AIRDROPGUARD_API_KEY: z.string().min(1),
  BOT_OWNER_USER_ID: optionalString,
  VERIFIED_ROLE_ID: optionalString,
  PREMIUM_ROLE_ID: optionalString,
  ADMIN_ROLE_ID: optionalString,
  MODERATOR_ROLE_ID: optionalString,
  FOUNDER_ROLE_ID: optionalString,
  WELCOME_CHANNEL_ID: optionalString,
  LOG_CHANNEL_ID: optionalString,
  ALERTS_CHANNEL_ID: optionalString,
  AIRDROPS_CHANNEL_ID: optionalString,
  UPDATES_CHANNEL_ID: optionalString,
  TICKET_CATEGORY_ID: optionalString,
  TICKET_SUPPORT_ROLE_ID: optionalString,
  AUTO_ASSIGN_ROLE_IDS: optionalString,
  ENABLE_GUILD_COMMANDS: z.coerce.boolean().default(true),
  ANTI_SPAM_WINDOW_MS: z.coerce.number().int().positive().default(12000),
  ANTI_SPAM_MAX_MESSAGES: z.coerce.number().int().positive().default(6),
  MUTE_SECONDS_FOR_SPAM: z.coerce.number().int().positive().default(900),
  SCAM_DOMAIN_BLACKLIST: z.string().optional(),
  AUTOMATION_POLL_CRON: z.string().default("*/5 * * * *")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const errors = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  throw new Error(`Invalid environment configuration:\n${errors.join("\n")}`);
}

const base = parsed.data;

export const env = {
  ...base,
  AUTO_ASSIGN_ROLE_IDS: splitCsv(base.AUTO_ASSIGN_ROLE_IDS),
  SCAM_DOMAIN_BLACKLIST: splitCsv(base.SCAM_DOMAIN_BLACKLIST).map((v) => v.toLowerCase())
};

export type Env = typeof env;
