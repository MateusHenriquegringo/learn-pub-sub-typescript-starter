import amqp from "amqplib";
import {declareAndBind, publishJSON} from "../internal/pubsub/shared.js";
import {ExchangePerilDirect, ExchangePerilTopic, GameLogKey, GameLogSlug, PauseKey} from "../internal/routing/routing.js";
import type {PlayingState} from "../internal/gamelogic/gamestate.js";
import {printServerHelp, getInput} from "../internal/gamelogic/gamelogic.js";

enum ServerCommand {
	Pause = "pause",
	Resume = "resume",
	Quit = "quit",
}

async function main() {
	console.log("Starting Peril server...");

	let conn = await amqp.connect("amqp://guest:guest@localhost:5672/");
	let channel = await conn.createConfirmChannel();

	await declareAndBind(
			conn,
			ExchangePerilTopic,
			GameLogSlug,
			GameLogKey,
			{durable: true, transient: false}
	)

	printServerHelp();

	while (true) {
		const words = await getInput();

		const command = words[0];

		if (command === ServerCommand.Pause) {
			console.log("Sending pause message...");
			await publishJSON(
					channel,
					ExchangePerilDirect,
					PauseKey,
					{isPaused: true} as PlayingState
			);
		} else if (command === ServerCommand.Resume) {
			console.log("Sending resume message...");
			await publishJSON(
					channel,
					ExchangePerilDirect,
					PauseKey,
					{isPaused: false} as PlayingState
			);
		} else if (command === ServerCommand.Quit) {
			console.log("Exiting...");
			break;
		} else {
			console.log(`I don't understand the command: ${command}`);
		}
	}

	await channel.close();
	await conn.close();
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
}).then(() => {
	console.log("Peril server exited successfully.");
});
