import amqp from "amqplib";
import { publishJSON } from "../internal/pubsub/shared.js";
import { ExchangePerilDirect, PauseKey } from "../internal/routing/routing.js";
import type { PlayingState } from "../internal/gamelogic/gamestate.js";

async function main() {
  console.log("Starting Peril server...");

  let conn = await amqp.connect("amqp://guest:guest@localhost:5672/");
  let channel = await conn.createConfirmChannel()

  publishJSON(
    channel,
    ExchangePerilDirect,
    PauseKey,
    { isPaused: true } as PlayingState
  )
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
}).then(() => {
  console.log("Peril server started successfully.");
});
