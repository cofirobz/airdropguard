import { AirdropApiPort } from "../ports/AirdropApiPort";

export class AirdropQueryService {
  public constructor(private readonly api: AirdropApiPort) {}

  public latest(limit = 5) {
    return this.api.getLatestVerified(limit);
  }

  public search(project: string) {
    return this.api.searchProject(project);
  }

  public scam(project: string) {
    return this.api.searchProject(project);
  }

  public trustScore(project: string) {
    return this.api.searchProject(project);
  }

  public reward(project: string) {
    return this.api.searchProject(project);
  }

  public tasks(project: string) {
    return this.api.searchProject(project);
  }

  public addProject(payload: {
    name: string;
    website: string;
    category: string;
    estimatedReward: string;
    tasks: string[];
    summary: string;
  }) {
    return this.api.addProject(payload);
  }

  public removeProject(project: string) {
    return this.api.removeProject(project);
  }
}
