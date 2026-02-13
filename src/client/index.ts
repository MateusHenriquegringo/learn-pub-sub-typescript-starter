import amqp from "amqplib";
import {clientWelcome, commandStatus, getInput, printClientHelp, printQuit,} from "../internal/gamelogic/gamelogic.js";
import {AckType, publishJSON, subscribeJSON} from "../internal/pubsub/shared.js";
import {ArmyMovesPrefix, ExchangePerilDirect, ExchangePerilTopic, PauseKey} from "../internal/routing/routing.js";
import {GameState, type PlayingState} from "../internal/gamelogic/gamestate.js";
import {commandSpawn} from "../internal/gamelogic/spawn.js";
import {commandMove, handleMove, MoveOutcome} from "../internal/gamelogic/move.js";
import type {ArmyMove} from "../internal/gamelogic/gamedata.js";
import {handlePause} from "../internal/gamelogic/pause.js";

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
			(ps: PlayingState): AckType => {
				handlePause(gameState, ps);
				console.log('> ');
				return AckType.Ack;
			}
	)

	await subscribeJSON(
			conn,
			ExchangePerilTopic,
			ArmyMovesPrefix + '.' + username,
			ArmyMovesPrefix + '.*',
			{transient: false, durable: false},
			(move: ArmyMove): AckType => {
				const moveOut = handleMove(gameState, move);
				console.log('> ');
				return (moveOut === MoveOutcome.Safe || moveOut === MoveOutcome.MakeWar) ? AckType.Ack : AckType.NackDiscard;
			}
	);

	while (true) {
		const words = await getInput();
		const command = words[0];

		try {
			switch (command) {
				case ClientCommand.Spawn:
					commandSpawn(gameState, words);
					break;
				case ClientCommand.Move:
					const move = commandMove(gameState, words);
					await publishJSON(
							await conn.createConfirmChannel(),
							ExchangePerilTopic,
							ArmyMovesPrefix.concat('.' + username),
							move
					)
					console.log('Move sent to server!');
					break;
				case ClientCommand.Status:
					await commandStatus(gameState);
					break;
				case ClientCommand.Help:
					printClientHelp();
					break;
				case ClientCommand.Spam:
					console.log("Spamming not allowed yet!");
					break;
				case ClientCommand.Quit:
					printQuit();
					return;
				default:
					console.log(`Unknown command: ${command}`);
			}
		} catch (err) {
			if (err instanceof Error) {
				console.log(err.message);
			}
		}
	}
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
})
