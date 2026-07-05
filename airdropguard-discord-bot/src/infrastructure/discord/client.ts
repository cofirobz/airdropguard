import { Client, GatewayIntentBits } from "discord.js";

const requiredIntents = [GatewayIntentBits.Guilds];

export const createDiscordClient = (): Client =>
  new Client({
    intents: requiredIntents
  });
