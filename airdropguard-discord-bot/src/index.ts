import { bootstrap } from "./bootstrap";
import { logger, serializeError } from "./core/logger/logger";

void bootstrap().catch((error) => {
  logger.error("Fatal startup error", serializeError(error));
  process.exit(1);
});
