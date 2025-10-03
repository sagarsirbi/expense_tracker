# 🏢 Expense Tracker Admin Guide

## Overview
Your expense tracker application now includes enterprise-level admin capabilities for managing users, roles, and system oversight.

## 🚀 Getting Started

### 1. Create Your First Admin User
```bash
# Run the admin setup script
node create-admin.js
```

Follow the prompts to create your admin account with:
- Email address
- Display name  
- Secure password

### 2. Start the Application
```bash
# Development mode
npm run dev

# OR Production mode
npm run build
npm run electron
```

### 3. Access Admin Features
1. Navigate to http://localhost:5173 (dev) or launch the Electron app
2. Login with your admin credentials
3. Look for the **"Admin Panel"** tab in the top navigation

## 🎛️ Admin Panel Features

### **Dashboard Overview**
The admin dashboard provides key metrics:
- **Total Users**: Complete user count
- **Active Users**: Currently enabled accounts
- **Admin Count**: Number of admin users
- **Recent Activity**: Latest user registrations

### **User Management Table**
Comprehensive user control with these columns:
- **User Info**: Email, display name, and profile
- **Role**: Admin or User designation
- **Status**: Active/Inactive state
- **Last Login**: Recent activity tracking
- **Actions**: Management buttons

## 🔧 Admin Operations

### **Role Management**
- **Promote to Admin**: Grant admin privileges to users
- **Demote to User**: Remove admin privileges
- **Role Badge**: Visual indicator of current role

### **User Status Control**
- **Activate User**: Enable account access
- **Deactivate User**: Suspend account without deletion
- **Status Badge**: Green (Active) / Red (Inactive) indicators

### **User Account Management**
- **View User Details**: Complete profile information
- **Delete User**: Permanently remove user and all data
- **Bulk Operations**: Manage multiple users efficiently

## 🔐 Security Features

### **Access Control**
- Admin panel only visible to admin users
- Role-based permission system
- Secure authentication required for all operations

### **Audit Trail**
- Last login tracking for all users
- User creation timestamps
- Role change history (logged in database)

## 📊 User Statistics

### **Key Metrics**
- Total registered users
- Active vs inactive user ratio
- Admin user distribution
- User growth tracking

### **Activity Monitoring**
- Recent user registrations
- Login activity patterns
- Account status changes

## 🎯 Common Admin Tasks

### **Adding New Admin Users**
1. Register new user through normal registration
2. Login as admin
3. Navigate to Admin Panel
4. Find user in table and click "Promote to Admin"

### **Managing User Access**
1. Go to Admin Panel
2. Locate user in the table
3. Use toggle buttons to:
   - Activate/Deactivate accounts
   - Change roles
   - Delete accounts if needed

### **Monitoring System Health**
1. Check dashboard statistics regularly
2. Review user activity patterns
3. Monitor admin user count
4. Ensure proper role distribution

## 🚨 Best Practice Guidelines

### **Security**
- Regularly review admin user list
- Deactivate unused accounts
- Monitor for suspicious login patterns
- Keep admin count minimal but sufficient

### **User Management**
- Use deactivation instead of deletion when possible
- Communicate role changes to affected users
- Maintain proper admin-to-user ratios
- Document major user management decisions

### **System Maintenance**
- Regular database backups recommended
- Monitor application logs for errors
- Test admin functions periodically
- Keep user documentation updated

## 🔍 Troubleshooting

### **Can't See Admin Panel**
- Ensure you're logged in as an admin user
- Check user role in database: `SELECT role FROM users WHERE email = 'your-email';`
- Try refreshing the application

### **User Operations Failing**
- Verify admin permissions
- Check database connectivity
- Review browser console for errors
- Ensure proper authentication

### **Database Issues**
- Check SQLite database file permissions
- Verify database schema is up to date
- Run database integrity checks if needed

## 📞 Support

For technical issues or questions about admin features:
1. Check the browser console for error messages
2. Review application logs
3. Verify database status and connectivity
4. Test with a fresh admin account

## 🆕 What's New in Enterprise Features

- **Role-based access control**
- **User activity monitoring** 
- **Comprehensive user management**
- **Professional admin interface**
- **Real-time user statistics**
- **Secure authentication system**
- **Database-backed user roles**

Your expense tracker is now ready for enterprise use with full admin capabilities!