const testBody = {
  level: 'info',
  message: 'Test frontend log submission',
  source: 'frontend',
  sessionId: 'test-session-123',
  correlationId: 'test-corr-456',
  url: 'http://localhost:5173/',
  userAgent: 'Test Agent',
  context: {
    component: 'TestComponent',
    action: 'testAction'
  }
};

fetch('http://localhost:3001/api/logs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(testBody)
})
.then(response => response.json())
.then(data => {
  console.log('✅ Frontend log submission test:', data);
  
  // Test log retrieval
  return fetch('http://localhost:3001/api/logs?limit=10');
})
.then(response => response.json())
.then(data => {
  console.log('✅ Log retrieval test:', data);
})
.catch(error => {
  console.error('❌ Test failed:', error);
});