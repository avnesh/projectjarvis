// test/smoke.test.js - Basic smoke tests for server functionality
import request from 'supertest';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.MONGODB_URI = 'mongodb://localhost:27017/jarvis-test';

// Import app after setting environment
const { default: app } = await import('../server.js');

describe('Server Smoke Tests', () => {
  afterAll(async () => {
    // Clean up any open handles
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'OK');
    });
  });

  describe('API Root', () => {
    it('should return API info', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for invalid endpoints', async () => {
      await request(app)
        .get('/api/invalid-endpoint')
        .expect(404);
    });
  });
});
