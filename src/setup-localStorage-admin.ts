// Browser localStorage admin user setup
// This needs to be run in the browser console to add the admin user to localStorage

function createLocalStorageAdmin() {
  console.log('🔄 Creating admin user in localStorage for browser mode...');
  
  const adminUser = {
    id: 'user_admin_demo',
    email: 'admin@demo.com',
    password_hash: '$2a$12$YourHashHere', // This will be replaced with actual hash
    display_name: 'Demo Admin',
    role: 'admin',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  // Get existing users from localStorage
  const existingUsers = JSON.parse(localStorage.getItem('users') || '[]');
  
  // Remove any existing admin user with same email
  const filteredUsers = existingUsers.filter(user => user.email !== 'admin@demo.com');
  
  // Add the new admin user
  filteredUsers.push(adminUser);
  
  // Save back to localStorage
  localStorage.setItem('users', JSON.stringify(filteredUsers));
  
  console.log('✅ Admin user added to localStorage!');
  console.log('📧 Email: admin@demo.com');
  console.log('🔑 Password: admin123');
  console.log('👑 Role: admin');
  
  return adminUser;
}

// Export for use in browser
if (typeof window !== 'undefined') {
  window.createLocalStorageAdmin = createLocalStorageAdmin;
}

export default createLocalStorageAdmin;