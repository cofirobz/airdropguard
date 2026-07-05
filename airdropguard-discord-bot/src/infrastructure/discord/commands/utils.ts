import { EmbedBuilder } from "discord.js";
import { AirdropProject } from "../../../domain/models/Airdrop";

export const projectSummaryEmbed = (project: AirdropProject): EmbedBuilder =>
  new EmbedBuilder()
    .setColor(project.flaggedScam ? 0xed4245 : 0x57f287)
    .setTitle(project.name)
    .setDescription(project.summary ?? "No summary provided")
    .addFields(
      { name: "Verified", value: project.verified ? "Yes" : "No", inline: true },
      { name: "Trust Score", value: `${project.trustScore}/100`, inline: true },
      { name: "Scam Flag", value: project.flaggedScam ? "Flagged" : "Clear", inline: true }
    )
    .setURL(project.website ?? "https://airdropguard.com")
    .setTimestamp(project.publishedAt ? new Date(project.publishedAt) : new Date());

export const notFoundMessage = (project: string): string =>
  `No project data found for \"${project}\" in AirdropGuard.`;
