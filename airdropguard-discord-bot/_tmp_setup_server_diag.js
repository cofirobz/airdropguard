require('dotenv').config();
const { createDiscordClient } = require('./dist/infrastructure/discord/client.js');
const { runSetupServer } = require('./dist/infrastructure/discord/commands/admin/setupserver.js');

const guildId = process.env.DISCORD_GUILD_ID;
const token = process.env.DISCORD_TOKEN;

if (!guildId || !token) {
  console.log('SETUP_OK=false');
  console.log('ERROR_NAME=ConfigError');
  console.log('ERROR_MESSAGE=Missing DISCORD_GUILD_ID or DISCORD_TOKEN');
  process.exit(1);
}

const client = createDiscordClient();
client.once('ready', async () => {
  try {
    const guild = await client.guilds.fetch(guildId);
    await guild.fetch();
    const summary = await runSetupServer(guild);
    console.log('SETUP_OK=true');
    console.log('ROLES_CREATED=' + summary.createdRoles.length);
    console.log('CATEGORIES_CREATED=' + summary.createdCategories.length);
    console.log('CHANNELS_CREATED=' + summary.createdChannels.length);
  } catch (error) {
    console.log('SETUP_OK=false');
    console.log('ERROR_NAME=' + (error?.name || 'Unknown'));
    console.log('ERROR_MESSAGE=' + (error?.message || String(error)));
    if (error && error.action) console.log('FAILED_ACTION=' + error.action);
    if (error && error.status !== undefined) console.log('DISCORD_STATUS=' + error.status);
    if (error && error.code !== undefined) console.log('DISCORD_CODE=' + error.code);
    if (error && error.discordMessage) console.log('DISCORD_MESSAGE=' + error.discordMessage);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(token).catch((e) => {
  console.log('SETUP_OK=false');
  console.log('ERROR_NAME=LoginError');
  console.log('ERROR_MESSAGE=' + e.message);
  process.exit(1);
});
