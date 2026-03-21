const amqp = require("amqplib");
require("dotenv").config();

let connection = null;
let channel = null;

const EXCHANGES = {
  EMERGENCY: "emergency.events",
  DISPATCH: "dispatch.events",
  HOSPITAL: "hospital.events",
};

const connect = async () => {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    // Assert all exchanges
    await channel.assertExchange(EXCHANGES.EMERGENCY, "topic", {
      durable: true,
    });
    await channel.assertExchange(EXCHANGES.DISPATCH, "topic", {
      durable: true,
    });
    await channel.assertExchange(EXCHANGES.HOSPITAL, "topic", {
      durable: true,
    });

    console.log("✅ RabbitMQ connected");

    connection.on("error", (err) => {
      console.error("❌ RabbitMQ connection error:", err.message);
      setTimeout(connect, 5000);
    });

    connection.on("close", () => {
      console.warn("⚠️ RabbitMQ connection closed, reconnecting...");
      setTimeout(connect, 5000);
    });
  } catch (err) {
    console.error("❌ RabbitMQ connection failed:", err.message);
    setTimeout(connect, 5000);
  }
};

const publishEvent = async (exchange, routingKey, data) => {
  try {
    if (!channel) {
      console.warn(
        "⚠️ RabbitMQ channel not ready, skipping event:",
        routingKey,
      );
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
