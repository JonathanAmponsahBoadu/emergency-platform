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
  INCIDENT_CREATED: "q.analytics.incident.created",
  INCIDENT_DISPATCHED: "q.analytics.incident.dispatched",
  INCIDENT_STATUS: "q.analytics.incident.status",
  INCIDENT_RESOLVED: "q.analytics.incident.resolved",
  DISPATCH_ARRIVED: "q.analytics.dispatch.arrived",
  DISPATCH_RETURNING: "q.analytics.dispatch.returning",
  HOSPITAL_CAPACITY: "q.analytics.hospital.capacity",
};

const connect = async (handlers) => {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    // Assert exchanges
    await channel.assertExchange(EXCHANGES.EMERGENCY, "topic", {
      durable: true,
    });
    await channel.assertExchange(EXCHANGES.DISPATCH, "topic", {
      durable: true,
    });
    await channel.assertExchange(EXCHANGES.HOSPITAL, "topic", {
      durable: true,
    });

    // Assert and bind all queues
    await channel.assertQueue(QUEUES.INCIDENT_CREATED, { durable: true });
    await channel.bindQueue(
      QUEUES.INCIDENT_CREATED,
      EXCHANGES.EMERGENCY,
      "incident.created",
    );

    await channel.assertQueue(QUEUES.INCIDENT_DISPATCHED, { durable: true });
    await channel.bindQueue(
      QUEUES.INCIDENT_DISPATCHED,
      EXCHANGES.EMERGENCY,
      "incident.dispatched",
    );

    await channel.assertQueue(QUEUES.INCIDENT_STATUS, { durable: true });
    await channel.bindQueue(
      QUEUES.INCIDENT_STATUS,
      EXCHANGES.EMERGENCY,
      "incident.status.updated",
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

    await channel.assertQueue(QUEUES.HOSPITAL_CAPACITY, { durable: true });
    await channel.bindQueue(
      QUEUES.HOSPITAL_CAPACITY,
      EXCHANGES.HOSPITAL,
      "hospital.capacity.updated",
    );

    // Set up consumers
    const consume = (queue, handler) => {
      channel.consume(queue, async (msg) => {
        if (msg) {
          try {
            const event = JSON.parse(msg.content.toString());
            console.log(`📥 Analytics received: ${event.event}`);
            await handler(event.data);
            channel.ack(msg);
          } catch (err) {
            console.error(`❌ Error processing ${queue}:`, err.message);
            channel.nack(msg, false, false);
          }
        }
      });
    };

    consume(QUEUES.INCIDENT_CREATED, handlers.onIncidentCreated);
    consume(QUEUES.INCIDENT_DISPATCHED, handlers.onIncidentDispatched);
    consume(QUEUES.INCIDENT_STATUS, handlers.onIncidentStatusUpdated);
    consume(QUEUES.INCIDENT_RESOLVED, handlers.onIncidentResolved);
    consume(QUEUES.DISPATCH_ARRIVED, handlers.onDispatchArrived);
    consume(QUEUES.DISPATCH_RETURNING, handlers.onDispatchReturning);
    consume(QUEUES.HOSPITAL_CAPACITY, handlers.onHospitalCapacity);

    console.log("✅ RabbitMQ connected");

    connection.on("error", (err) => {
      console.error("❌ RabbitMQ error:", err.message);
      setTimeout(() => connect(handlers), 5000);
    });

    connection.on("close", () => {
      console.warn("⚠️ RabbitMQ closed, reconnecting...");
      setTimeout(() => connect(handlers), 5000);
    });
  } catch (err) {
    console.error("❌ RabbitMQ connection failed:", err.message);
    setTimeout(() => connect(handlers), 5000);
  }
};

module.exports = { connect };
