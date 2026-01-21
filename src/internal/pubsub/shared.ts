import type { ConfirmChannel, Channel, ChannelModel, Replies } from "amqplib";

export function publishJSON<T>(ch: ConfirmChannel, exchange: string, routingKey: string, value: T): Promise<void> {

	ch.publish(
		exchange,
		routingKey,
		Buffer.from(JSON.stringify(value)),
		{ contentType: 'application/json' }
	)

	return Promise.resolve()
}

export async function declareAndBind(
	conn: ChannelModel,
	exchange: string,
	queueName: string,
	key: string,
	queueType: { durable?: boolean, transient: boolean },
): Promise<[Channel, Replies.AssertQueue]> {

	const channel = await conn.createConfirmChannel()

	const assertQueue: Replies.AssertQueue = await channel.assertQueue(queueName, {
		durable: queueType.durable,
		autoDelete: queueType.transient,
		exclusive: queueType.transient
	})

	await channel.bindQueue(queueName, exchange, key)

	return [channel, assertQueue]

};