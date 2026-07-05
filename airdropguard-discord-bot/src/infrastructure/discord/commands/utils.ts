import { EmbedBuilder } from "discord.js";
import { AirdropProject } from "../../../domain/models/Airdrop";

export const projectSummaryEmbed = (project: AirdropProject): EmbedBuilder =>
  new EmbedBuilder()
    .setColor(project.flaggedScam ? 0xed4245 : 0x57f287)
    .setTitle(project.name)
    .setDescription(project.summary ?? "Published listing from AirdropGuard.")
    .addFields(
      { name: "Listing", value: project.verified ? "Verified" : "Under Review", inline: true },
      { name: "Trust Score", value: `${project.trustScore}/100`, inline: true },
      { name: "Risk Signal", value: project.flaggedScam ? "Scam Alert" : "No Active Scam Alert", inline: true },
      { name: "Reward Estimate", value: project.estimatedReward ?? "Not published", inline: true }
    )
    .setURL(project.website ?? "https://airdropguard.com")
    .setFooter({ text: "AirdropGuard | Check Before You Connect." })
    .setTimestamp(project.publishedAt ? new Date(project.publishedAt) : new Date());

export const notFoundMessage = (project: string): string =>
  `No project data found for \"${project}\" in AirdropGuard.`;
