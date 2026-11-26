import { loadConfig } from "./config.ts";
import { listen } from "./app.ts";

const config = loadConfig();
const server = listen({ config });
server.on("listening", () => {
  const llm = Boolean(config.llmApiKey && config.llmModel && config.llmBaseUrl);
  console.log(`moderation agent on :${config.port} (llm ${llm ? "on" : "off"}, vision ${config.visionModel ? "on" : "off"})`);
});
