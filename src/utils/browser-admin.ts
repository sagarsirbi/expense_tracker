// Pre-create admin user with browser-compatible hash
function createPreBuiltAdmin() {
    console.log('👤 Creating pre-built admin user...');
    
    // This is a bcryptjs hash of "admin123" created server-side
    const adminUser = {
        id: 'user_admin_demo_' + Date.now(),
        email: 'admin@demo.com',
        password_hash: '$2a$12$LQv3c1yqBw2Tps.gvLHn1uH/BNFPz8w.KJEITDJoGKrEQXrIJYBJ2', // bcrypt hash of "admin123"
        display_name: 'Demo Admin',
        role: 'admin',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    let users = JSON.parse(localStorage.getItem('users') || '[]');
    // Remove any existing admin user
    users = users.filter(u => u.email !== 'admin@demo.com');
    // Add the new admin user
    users.push(adminUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    console.log('✅ Pre-built admin user created successfully!');
    console.log('📧 Email: admin@demo.com');
    console.log('🔑 Password: admin123');
    
    return adminUser;
}

// Expose to global scope for browser access
if (typeof window !== 'undefined') {
    window.createPreBuiltAdmin = createPreBuiltAdmin;
}

export default createPreBuiltAdmin;