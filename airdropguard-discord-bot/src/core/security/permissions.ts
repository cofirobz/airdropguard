import { ChatInputCommandInteraction, GuildMember } from "discord.js";

export type AccessRole = "founder" | "admin" | "moderator" | "verified" | "premium";

export interface PermissionConfig {
  founderRoleId: string;
  adminRoleId: string;
  moderatorRoleId: string;
  verifiedRoleId: string;
  premiumRoleId?: string;
  ownerUserId?: string;
}

export class PermissionGuard {
  public constructor(private readonly cfg: PermissionConfig) {}

  public hasRole(member: GuildMember, role: AccessRole): boolean {
    if (this.cfg.ownerUserId && member.id === this.cfg.ownerUserId) {
      return true;
    }

    const roleId =
      role === "founder"
        ? this.cfg.founderRoleId
        : role === "admin"
          ? this.cfg.adminRoleId
          : role === "moderator"
            ? this.cfg.moderatorRoleId
            : role === "verified"
              ? this.cfg.verifiedRoleId
              : this.cfg.premiumRoleId;

    if (!roleId) {
      return false;
    }

    return member.roles.cache.has(roleId);
  }

  public isAdminOrAbove(member: GuildMember): boolean {
    return this.hasRole(member, "founder") || this.hasRole(member, "admin");
  }

  public isModeratorOrAbove(member: GuildMember): boolean {
    return this.isAdminOrAbove(member) || this.hasRole(member, "moderator");
  }

  public async ensureAdmin(interaction: ChatInputCommandInteraction): Promise<boolean> {
    if (!interaction.inGuild() || !interaction.member || !(interaction.member instanceof GuildMember)) {
      await interaction.reply({ content: "This command only works in a server.", ephemeral: true });
      return false;
    }

    if (!this.isAdminOrAbove(interaction.member)) {
      await interaction.reply({ content: "You do not have permission to run this command.", ephemeral: true });
      return false;
    }

    return true;
  }

  public async ensureModerator(interaction: ChatInputCommandInteraction): Promise<boolean> {
    if (!interaction.inGuild() || !interaction.member || !(interaction.member instanceof GuildMember)) {
      await interaction.reply({ content: "This command only works in a server.", ephemeral: true });
      return false;
    }

    if (!this.isModeratorOrAbove(interaction.member)) {
      await interaction.reply({ content: "You do not have permission to run this command.", ephemeral: true });
      return false;
    }

    return true;
  }
}
