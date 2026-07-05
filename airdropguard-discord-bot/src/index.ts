import { bootstrap } from "./bootstrap";
import { logger } from "./core/logger/logger";

void bootstrap().catch((error) => {
  logger.error("Fatal startup error", error);
  process.exit(1);
});
