const amqp = require("amqplib");
require("dotenv").config();

let connection = null;
let channel = null;

const EXCHANGES = {
  EMERGENCY: "emergency.events",
  DISPATCH: "dispatch.events",
  HOSPITAL: "hospital.events",
};

const QUEUES = {
  INCIDENT_DISPATCHED: "q.incident.dispatched",
  INCIDENT_RESOLVED: "q.incident.resolved",
  DISPATCH_ARRIVED: "q.dispatch.arrived",
  DISPATCH_RETURNING: "q.dispatch.returning",
  RESPONDER_CREATED: "q.incident.responder.created",
};

const connect = async (onIncidentDispatched, onResponderCreated) => {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGES.EMERGENCY, "topic", {
      durable: true,
    });
    await channel.assertExchange(EXCHANGES.DISPATCH, "topic", {
      durable: true,
    });
    await channel.assertExchange(EXCHANGES.HOSPITAL, "topic", {
      durable: true,
    });

    // Assert and bind queues
    await channel.assertQueue(QUEUES.INCIDENT_DISPATCHED, { durable: true });
    await channel.bindQueue(
      QUEUES.INCIDENT_DISPATCHED,
      EXCHANGES.EMERGENCY,
      "incident.dispatched",
    );

    await channel.assertQueue(QUEUES.INCIDENT_RESOLVED, { durable: true });
    await channel.bindQueue(
      QUEUES.INCIDENT_RESOLVED,
      EXCHANGES.EMERGENCY,
      "incident.resolved",
    );

    await channel.assertQueue(QUEUES.DISPATCH_ARRIVED, { durable: true });
    await channel.bindQueue(
      QUEUES.DISPATCH_ARRIVED,
      EXCHANGES.DISPATCH,
      "dispatch.vehicle.arrived",
    );

    await channel.assertQueue(QUEUES.DISPATCH_RETURNING, { durable: true });
    await channel.bindQueue(
      QUEUES.DISPATCH_RETURNING,
      EXCHANGES.DISPATCH,
      "dispatch.vehicle.returning",
    );
    
    await channel.assertQueue(QUEUES.RESPONDER_CREATED, { durable: true });
    await channel.bindQueue(
      QUEUES.RESPONDER_CREATED,
      EXCHANGES.EMERGENCY,
      "incident.responder.created",
    );

    // Consume incident.dispatched events
    channel.consume(QUEUES.INCIDENT_DISPATCHED, async (msg) => {
      if (msg) {
        const event = JSON.parse(msg.content.toString());
        console.log(
          "📥 Event received: incident.dispatched",
          event.data.incident_id,
        );
        if (onIncidentDispatched) await onIncidentDispatched(event.data);
        channel.ack(msg);
      }
    });

    // Consume incident.responder.created events
    channel.consume(QUEUES.RESPONDER_CREATED, async (msg) => {
      if (msg) {
        const event = JSON.parse(msg.content.toString());
        console.log("📥 Event received: responder.created", event.data.responder_id);
        if (onResponderCreated) await onResponderCreated(event.data);
        channel.ack(msg);
      }
    });

    console.log("✅ RabbitMQ connected");

    connection.on("error", (err) => {
      console.error("❌ RabbitMQ error:", err.message);
      setTimeout(() => connect(onIncidentDispatched, onResponderCreated), 5000);
    });

    connection.on("close", () => {
      console.warn("⚠️ RabbitMQ closed, reconnecting...");
      setTimeout(() => connect(onIncidentDispatched, onResponderCreated), 5000);
    });
  } catch (err) {
    console.error("❌ RabbitMQ connection failed:", err.message);
    setTimeout(() => connect(onIncidentDispatched, onResponderCreated), 5000);
  }
};

const publishEvent = async (exchange, routingKey, data) => {
  try {
    if (!channel) {
      console.warn("⚠️ RabbitMQ channel not ready, skipping:", routingKey);
      return;
    }
    const message = JSON.stringify({
      event: routingKey,
      timestamp: new Date().toISOString(),
      data,
    });
    channel.publish(exchange, routingKey, Buffer.from(message), {
      persistent: true,
    });
    console.log(`📤 Event published: ${routingKey}`);
  } catch (err) {
    console.error("❌ Failed to publish event:", err.message);
  }
};

module.exports = { connect, publishEvent, EXCHANGES };
