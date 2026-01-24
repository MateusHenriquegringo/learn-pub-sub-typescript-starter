import type { ConfirmChannel, Channel, ChannelModel, Replies } from "amqplib";
export type SimpleQueueType = { durable?: boolean, transient: boolean };

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
	queueType: SimpleQueueType,
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


export async function subscribeJSON<T>(
		conn: ChannelModel,
		exchange: string,
		queueName: string,
		key: string,
		queueType: SimpleQueueType,
		handler: (data: T) => void,
): Promise<void> {

	let [channel, queue] = await declareAndBind(conn, exchange, queueName, key, queueType)

	await channel.consume(queue.queue, (msg) => {
		if (!msg) return;

		const parsed = JSON.parse(msg.content.toString()) as T;
		handler(parsed)

		channel.ack(msg)
	})
};
