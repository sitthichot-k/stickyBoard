import swaggerJSDoc from 'swagger-jsdoc';

// OpenAPI spec, assembled from @openapi JSDoc blocks under src/swagger/*.js.
// Add a block there when you add an endpoint (see docs/architecture/swagger-guide.md).
export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Sticky Board API',
      version: '1.0.0',
      description:
        'REST API. Most endpoints require a Bearer token; access is then governed ' +
        'by the permission matrix (see the Security module).',
    },
    servers: [{ url: '/api/v1' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth' },
      { name: 'Sheets' },
      { name: 'Notes' },
      { name: 'Admin' },
    ],
  },
  apis: ['./src/swagger/*.js'],
});
