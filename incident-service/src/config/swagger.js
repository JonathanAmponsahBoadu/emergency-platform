const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Incident Service API",
      version: "1.0.0",
      description:
        "Emergency Incident Service for the National Emergency Response Platform",
    },
    servers: [
      {
        url: "https://emergency-incident-service-uq3s.onrender.com",
        description: "Production server",
      },
      {
        url: "http://localhost:3002",
        description: "Development server",
      },
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
