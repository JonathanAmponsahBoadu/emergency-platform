const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Analytics Service API",
      version: "1.0.0",
      description:
        "Analytics and Monitoring Service for the National Emergency Response Platform",
    },
    servers: [
      { url: "http://localhost:3004", description: "Development server" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.js"],
};

module.exports = swaggerJsdoc(options);
