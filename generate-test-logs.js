const levels = ['info', 'warn', 'error', 'debug'];
const messages = [
  'User logged in successfully',
  'Database connection established',  
  'API request processed',
  'Cache miss detected',
  'Email notification sent',
  'File upload completed'
];

async function generateLogs() {
  for (let i = 0; i < 6; i++) {
    const level = levels[Math.floor(Math.random() * levels.length)];
    const message = messages[Math.floor(Math.random() * messages.length)];
    
    const logData = {
      level,
      message: `${message} (${i + 1})`,
      source: 'frontend-test',
      sessionId: 'demo-session',
      metadata: {
        timestamp: new Date().toISOString(),
        component: 'LogTester',
        iteration: i + 1
      }
    };
    
    try {
      const response = await fetch('http://localhost:3001/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      });
      const result = await response.json();
      console.log(`✅ Log ${i + 1} (${level}): ${result.status}`);
      
      // Small delay between logs
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`❌ Failed to send log ${i + 1}:`, error.message);
    }
  }
  console.log('🎉 Test logs generated! Refresh the log viewer to see them.');
}

generateLogs();