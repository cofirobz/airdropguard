import { Client } from "discord.js";
import { AirdropQueryService } from "../../application/services/AirdropQueryService";
import { AirdropApiPort } from "../../application/ports/AirdropApiPort";
import { PermissionGuard } from "../../core/security/permissions";
import { SlidingWindowLimiter } from "../../core/security/rateLimiter";
import { OpenAiAssistant } from "../ai/OpenAiAssistant";
import { TicketService } from "./tickets/TicketService";
import { AutoModerationService } from "./moderation/AutoModerationService";
import { VerificationService } from "./verification/VerificationService";
import { AutomationPublisher } from "./automation/AutomationPublisher";

export interface BotServices {
  client: Client;
  api: AirdropApiPort;
  queryService: AirdropQueryService;
  permissions: PermissionGuard;
  aiAssistant: OpenAiAssistant;
  ticketService: TicketService;
  autoModeration: AutoModerationService;
  verification: VerificationService;
  automation: AutomationPublisher;
  interactionLimiter: SlidingWindowLimiter;
  channels: {
    airdrops?: string;
    alerts?: string;
    updates?: string;
    logs?: string;
  };
}
