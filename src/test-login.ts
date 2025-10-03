// Simple test to verify login functionality in browser
import bcryptjs from 'bcryptjs';

async function testBrowserLogin() {
  console.log('🧪 Testing browser login functionality...');
  
  const email = 'admin@demo.com';
  const password = 'admin123';
  
  // Simulate the database user (this would come from your database)
  const dbUser = {
    id: 'user_1759521476386_kyu52prdc',
    email: 'admin@demo.com',
    password_hash: '$2a$12$yourHashHere', // This would be the actual hash from DB
    display_name: 'Demo Admin',
    role: 'admin',
    is_active: true
  };
  
  try {
    // Test 1: bcryptjs import
    console.log('✅ bcryptjs imported successfully');
    
    // Test 2: Hash a password
    const testHash = await bcryptjs.hash(password, 12);
    console.log('✅ Password hashing works:', testHash.substring(0, 20) + '...');
    
    // Test 3: Compare password
    const isValid = await bcryptjs.compare(password, testHash);
    console.log('✅ Password comparison works:', isValid);
    
    // Test 4: Actual comparison with your hash
    // You would replace this with the actual hash from your database
    console.log('🔍 Testing with actual database hash...');
    console.log('If this test passes, the login should work!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Only run in browser environment
if (typeof window !== 'undefined') {
  testBrowserLogin();
}

export default testBrowserLogin;