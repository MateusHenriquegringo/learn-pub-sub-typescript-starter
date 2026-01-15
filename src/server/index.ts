import amqp from "amqplib";

async function main() {
  console.log("Starting Peril server...");
}

main().catch((err) => {
  amqp.connect("amqp://guest:guest@localhost:5672/");
  console.error("Fatal error:", err);
  process.exit(1);
}).then(() => {
  console.log("Peril server started successfully.");
});
