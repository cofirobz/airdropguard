import axios, { AxiosInstance } from "axios";
import { AirdropApiPort } from "../../application/ports/AirdropApiPort";
import { AirdropProject, ScamAlert, TrustScoreBreakdown, WebsiteUpdate } from "../../domain/models/Airdrop";

const defaultBreakdown: TrustScoreBreakdown = {
  team: 0,
  security: 0,
  tokenomics: 0,
  community: 0,
  transparency: 0
};

const normalizeTasks = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((v) => String(v));
  }
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeReasons = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((v) => String(v));
  }
  if (typeof value === "string") {
    return [value];
  }
  return [];
};

const toProject = (raw: any): AirdropProject => ({
  id: String(raw.id ?? raw.slug ?? raw.name ?? crypto.randomUUID()),
  name: String(raw.name ?? "Unknown"),
  category: raw.category ? String(raw.category) : undefined,
  website: raw.website ? String(raw.website) : undefined,
  summary: raw.summary ? String(raw.summary) : undefined,
  verified: Boolean(raw.verified ?? true),
  flaggedScam: Boolean(raw.flaggedScam ?? raw.is_scam ?? false),
  scamReasons: normalizeReasons(raw.scamReasons ?? raw.scam_reasons),
  trustScore: Number(raw.trustScore ?? raw.trust_score ?? 0),
  trustScoreBreakdown: {
    team: Number(raw.trustScoreBreakdown?.team ?? raw.team_score ?? defaultBreakdown.team),
    security: Number(raw.trustScoreBreakdown?.security ?? raw.security_score ?? defaultBreakdown.security),
    tokenomics: Number(raw.trustScoreBreakdown?.tokenomics ?? raw.tokenomics_score ?? defaultBreakdown.tokenomics),
    community: Number(raw.trustScoreBreakdown?.community ?? raw.community_score ?? defaultBreakdown.community),
    transparency: Number(
      raw.trustScoreBreakdown?.transparency ?? raw.transparency_score ?? defaultBreakdown.transparency
    )
  },
  estimatedReward: raw.estimatedReward ? String(raw.estimatedReward) : raw.estimated_reward ? String(raw.estimated_reward) : undefined,
  tasks: normalizeTasks(raw.tasks),
  publishedAt: raw.publishedAt ? String(raw.publishedAt) : raw.published_at ? String(raw.published_at) : undefined
});

export class AirdropGuardApiClient implements AirdropApiPort {
  private readonly http: AxiosInstance;

  public constructor(baseUrl: string, apiKey?: string) {
    this.http = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
      headers: apiKey
        ? {
            Authorization: `Bearer ${apiKey}`,
            "x-api-key": apiKey
          }
        : undefined
    });
  }

  public async getLatestVerified(limit = 5): Promise<AirdropProject[]> {
    const response = await this.http.get("/airdrops/latest", {
      params: { verified: true, limit }
    });
    const data = Array.isArray(response.data) ? response.data : response.data?.items;
    return (Array.isArray(data) ? data : []).map(toProject);
  }

  public async searchProject(project: string): Promise<AirdropProject | null> {
    const response = await this.http.get("/airdrops/search", {
      params: { project }
    });

    const candidate = Array.isArray(response.data)
      ? response.data[0]
      : response.data?.item ?? response.data?.project ?? response.data;

    if (!candidate) {
      return null;
    }

    return toProject(candidate);
  }

  public async addProject(payload: {
    name: string;
    website: string;
    category: string;
    estimatedReward: string;
    tasks: string[];
    summary: string;
  }): Promise<AirdropProject> {
    const response = await this.http.post("/airdrops", {
      name: payload.name,
      website: payload.website,
      category: payload.category,
      estimated_reward: payload.estimatedReward,
      tasks: payload.tasks,
      summary: payload.summary,
      verified: true
    });

    return toProject(response.data?.item ?? response.data);
  }

  public async removeProject(project: string): Promise<void> {
    await this.http.delete(`/airdrops/${encodeURIComponent(project)}`);
  }

  public async getScamAlertsSince(sinceIso?: string): Promise<ScamAlert[]> {
    const response = await this.http.get("/alerts/scams", {
      params: sinceIso ? { since: sinceIso } : undefined
    });

    const data = Array.isArray(response.data) ? response.data : response.data?.items;
    return (Array.isArray(data) ? data : []).map((item: any) => ({
      id: String(item.id ?? crypto.randomUUID()),
      projectName: String(item.projectName ?? item.project_name ?? "Unknown"),
      reason: String(item.reason ?? "Potential scam behavior detected"),
      detectedAt: String(item.detectedAt ?? item.detected_at ?? new Date().toISOString()),
      severity: ["low", "medium", "high", "critical"].includes(String(item.severity))
        ? item.severity
        : "medium",
      sourceUrl: item.sourceUrl ? String(item.sourceUrl) : item.source_url ? String(item.source_url) : undefined
    }));
  }

  public async getWebsiteUpdatesSince(sinceIso?: string): Promise<WebsiteUpdate[]> {
    const response = await this.http.get("/updates", {
      params: sinceIso ? { since: sinceIso } : undefined
    });

    const data = Array.isArray(response.data) ? response.data : response.data?.items;
    return (Array.isArray(data) ? data : []).map((item: any) => ({
      id: String(item.id ?? crypto.randomUUID()),
      title: String(item.title ?? "AirdropGuard update"),
      details: String(item.details ?? item.description ?? "Website update posted."),
      url: String(item.url ?? "https://airdropguard.com"),
      publishedAt: String(item.publishedAt ?? item.published_at ?? new Date().toISOString())
    }));
  }
}
