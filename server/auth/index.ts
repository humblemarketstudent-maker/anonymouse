import { demoOtpEnabled, loadConfig, twilioReady } from "./config.ts";
import { listen } from "./app.ts";

const config = loadConfig();
const server = listen({ config });
server.on("listening", () => {
  const twilio = twilioReady(config);
  const demo = demoOtpEnabled(config);
  console.log(`auth api on :${config.port} (twilio ${twilio ? "on" : "off"}, demo otp ${demo ? "on" : "off"})`);
});
