const { spawn } = require('child_process');
const http = require('http');

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}/api`;

function startServer() {
  console.log('Starting server...');
  const server = spawn('node', ['server/index.js'], { cwd: 'd:/expense_tracker' });
  
  server.stdout.on('data', (data) => console.log(`Server stdout: ${data}`));
  server.stderr.on('data', (data) => console.error(`Server stderr: ${data}`));
  
  return server;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: PORT,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function verify() {
  let serverProcess;
  
  try {
    // 1. Start Server
    serverProcess = startServer();
    await wait(3000); // Wait for server to start

    // 2. Add Expense
    const expenseId = `exp_${Date.now()}`;
    console.log(`Adding expense ${expenseId}...`);
    const expense = {
      id: expenseId,
      date: '2025-01-01',
      category: 'Food',
      description: 'Test Expense',
      amount: 100
    };
    
    let res = await request('POST', '/expenses', expense);
    console.log('Add Response:', res.status, res.body);
    
    if (res.status !== 201) throw new Error('Failed to add expense');

    // 3. Verify it exists
    res = await request('GET', '/expenses');
    const expenses = res.body;
    const found = expenses.find(e => e.id === expenseId);
    console.log('Found expense in memory:', found ? 'YES' : 'NO');
    
    if (!found) throw new Error('Expense not found immediately after add');

    // 4. Restart Server (Simulate persistence check)
    console.log('Restarting server...');
    serverProcess.kill();
    await wait(2000);
    
    serverProcess = startServer();
    await wait(3000);

    // 5. Verify it still exists
    console.log('Checking persistence...');
    res = await request('GET', '/expenses');
    const persistedExpenses = res.body;
    const persistedFound = persistedExpenses.find(e => e.id === expenseId);
    console.log('Found expense after restart:', persistedFound ? 'YES' : 'NO');

    if (!persistedFound) throw new Error('Persistence FAILED');

    console.log('SUCCESS: Persistence verified!');

  } catch (error) {
    console.error('Verification FAILED:', error);
  } finally {
    if (serverProcess) serverProcess.kill();
  }
}

verify();
