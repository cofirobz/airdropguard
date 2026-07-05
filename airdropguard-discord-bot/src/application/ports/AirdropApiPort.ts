import { AirdropProject, ScamAlert, WebsiteUpdate } from "../../domain/models/Airdrop";

export interface AirdropApiPort {
  getLatestVerified(limit?: number): Promise<AirdropProject[]>;
  searchProject(project: string): Promise<AirdropProject | null>;
  addProject(payload: {
    name: string;
    website: string;
    category: string;
    estimatedReward: string;
    tasks: string[];
    summary: string;
  }): Promise<AirdropProject>;
  removeProject(project: string): Promise<void>;
  getScamAlertsSince(sinceIso?: string): Promise<ScamAlert[]>;
  getWebsiteUpdatesSince(sinceIso?: string): Promise<WebsiteUpdate[]>;
}
