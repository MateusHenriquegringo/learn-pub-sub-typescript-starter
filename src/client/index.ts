import amqp from "amqplib";
import {
	clientWelcome,
	getInput,
	printClientHelp,
	commandStatus,
	printQuit,
} from "../internal/gamelogic/gamelogic.js";
import {declareAndBind, publishJSON, subscribeJSON} from "../internal/pubsub/shared.js";
import {ArmyMovesPrefix, ExchangePerilDirect, ExchangePerilTopic, PauseKey} from "../internal/routing/routing.js";
import {GameState} from "../internal/gamelogic/gamestate.js";
import {commandSpawn} from "../internal/gamelogic/spawn.js";
import {commandMove, handleMove} from "../internal/gamelogic/move.js";
import {handlerPause} from "./handlers.js";
import type {ArmyMove} from "../internal/gamelogic/gamedata.js";

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

	const gameState = new GameState(username);
	await subscribeJSON(
			conn,
			ExchangePerilDirect,
			"pause.".concat(username),
			PauseKey,
			{transient: true},
			handlerPause(gameState)
	)

	await subscribeJSON(
			conn,
			ExchangePerilTopic,
			ArmyMovesPrefix.concat('.' + username),
			ArmyMovesPrefix,
			{transient: false, durable: false},
			(move: ArmyMove) => {
				handleMove(gameState, move);
			}
	)

	while (true) {
		const words = await getInput();

		const command = words[0];

		try {
			if (command === ClientCommand.Spawn) {
				commandSpawn(gameState, words);
			} else if (command === ClientCommand.Move) {
				const move = commandMove(gameState, words);

				await publishJSON(
						await conn.createConfirmChannel(),
						ExchangePerilTopic,
						ArmyMovesPrefix.concat('.' + username),
						move
				)
				console.log('Move sent to server!');
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
