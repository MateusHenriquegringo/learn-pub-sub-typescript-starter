import amqp from "amqplib";
import { clientWelcome } from "../internal/gamelogic/gamelogic.js";
import { declareAndBind } from "../internal/pubsub/shared.js";
import { ExchangePerilDirect, PauseKey } from "../internal/routing/routing.js";

async function main() {
  console.log("Starting Peril client...");

  let conn = await amqp.connect("amqp://guest:guest@localhost:5672/");
  let channel = await conn.createConfirmChannel()

  const username: string = await clientWelcome()

  declareAndBind(
    conn,
    ExchangePerilDirect,
    'pause.'.concat(username),
    PauseKey,
    { transient: true}
  )

}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
