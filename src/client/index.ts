import amqp from "amqplib";
import {
	clientWelcome,
	getInput,
	printClientHelp,
	commandStatus,
	printQuit,
} from "../internal/gamelogic/gamelogic.js";
import {declareAndBind, subscribeJSON} from "../internal/pubsub/shared.js";
import {ExchangePerilDirect, PauseKey} from "../internal/routing/routing.js";
import {GameState} from "../internal/gamelogic/gamestate.js";
import {commandSpawn} from "../internal/gamelogic/spawn.js";
import {commandMove} from "../internal/gamelogic/move.js";
import {handlerPause} from "./handlers.js";

enum ClientCommand {
	Spawn = "spawn",
	Move = "move",
	Status = "status",
	Help = "help",
	Spam = "spam",
	Quit = "quit",
}

async function main() {
	console.log("Starting Peril client...");

	let conn = await amqp.connect("amqp://guest:guest@localhost:5672/");

	const username: string = await clientWelcome();

	await declareAndBind(
			conn,
			ExchangePerilDirect,
			"pause.".concat(username),
			PauseKey,
			{transient: true}
	);

	const gameState = new GameState(username);
	await subscribeJSON(
			conn,
			ExchangePerilDirect,
			"pause.".concat(username),
			PauseKey,
			{transient: true},
			handlerPause(gameState)
	)

	while (true) {
		const words = await getInput();

		const command = words[0];

		try {
			if (command === ClientCommand.Spawn) {
				commandSpawn(gameState, words);
			} else if (command === ClientCommand.Move) {
				commandMove(gameState, words);
			} else if (command === ClientCommand.Status) {
				await commandStatus(gameState);
			} else if (command === ClientCommand.Help) {
				printClientHelp();
			} else if (command === ClientCommand.Spam) {
				console.log("Spamming not allowed yet!");
			} else if (command === ClientCommand.Quit) {
				printQuit();
				break;
			} else {
				console.log(`Unknown command: ${command}`);
			}
		} catch (err) {
			if (err instanceof Error) {
				console.log(err.message);
			}
		}
	}
	await conn.close();
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
