const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Tourlicity Backend API',
            version: '1.0.0',
            description: 'REST API for the Tourlicity tour management platform',
            contact: {
                name: 'Tourlicity Team',
                email: 'support@tourlicity.com'
            }
        },
        servers: [
            {
                url: process.env.API_BASE_URL || 'http://localhost:5000',
                description: 'Development server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ]
    },
    apis: ['./src/routes/*.js', './src/server.js']
};

const specs = swaggerJsdoc(options);

module.exports = {
    swaggerUi,
    specs
};