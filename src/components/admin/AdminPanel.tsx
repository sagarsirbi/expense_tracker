import React, { useState, useEffect } from 'react';
import type { User } from '../../services/auth';
import { AuthService } from '../../services/auth';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Shield, UserCheck, UserX, Crown, Trash2, BarChart3, UserPlus, Activity } from 'lucide-react';
import './AdminPanel.css';

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  newUsersThisMonth: number;
  usersWithGoogleAuth: number;
}

export const AdminPanel: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if current user is admin
  if (!currentUser || !AuthService.isAdmin(currentUser)) {
    return (
      <div className="admin-access-denied">
        <div className="access-denied-content">
          <Shield className="access-denied-icon" />
          <h2>Access Denied</h2>
          <p>You don't have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load users and stats
      const [usersResult, statsResult] = await Promise.all([
        AuthService.getAllUsers(),
        AuthService.getUserStats()
      ]);

      if (usersResult.success && usersResult.users) {
        setUsers(usersResult.users);
      } else {
        setError(usersResult.error || 'Failed to load users');
      }

      if (statsResult.success && statsResult.stats) {
        setStats(statsResult.stats);
      }
    } catch (err) {
      setError('Failed to load admin data');
      console.error('Admin data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: string) => {
    try {
      const result = await AuthService.toggleUserStatus(userId);
      if (result.success) {
        await loadData(); // Reload data
      } else {
        setError(result.error || 'Failed to update user status');
      }
    } catch (err) {
      setError('Failed to update user status');
    }
  };

  const handlePromoteToAdmin = async (userId: string) => {
    try {
      const result = await AuthService.promoteToAdmin(userId);
      if (result.success) {
        await loadData(); // Reload data
      } else {
        setError(result.error || 'Failed to promote user');
      }
    } catch (err) {
      setError('Failed to promote user');
    }
  };

  const handleDemoteToUser = async (userId: string) => {
    try {
      const result = await AuthService.demoteToUser(userId);
      if (result.success) {
        await loadData(); // Reload data
      } else {
        setError(result.error || 'Failed to demote user');
      }
    } catch (err) {
      setError('Failed to demote user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await AuthService.deleteUser(userId);
      if (result.success) {
        await loadData(); // Reload data
      } else {
        setError(result.error || 'Failed to delete user');
      }
    } catch (err) {
      setError('Failed to delete user');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleIcon = (role: string) => {
    return role === 'admin' ? <Crown className="role-icon admin" /> : <Users className="role-icon user" />;
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? 
      <UserCheck className="status-icon active" /> : 
      <UserX className="status-icon inactive" />;
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div className="admin-title">
          <Shield className="admin-icon" />
          <h1>Admin Panel</h1>
        </div>
        <div className="admin-subtitle">
          <p>Manage users and system settings</p>
        </div>
      </div>

      {error && (
        <div className="admin-error">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="admin-stats">
          <div className="stat-card">
            <div className="stat-icon">
              <Users />
            </div>
            <div className="stat-content">
              <h3>{stats.totalUsers}</h3>
              <p>Total Users</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon active">
              <Activity />
            </div>
            <div className="stat-content">
              <h3>{stats.activeUsers}</h3>
              <p>Active Users</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon admin">
              <Crown />
            </div>
            <div className="stat-content">
              <h3>{stats.adminUsers}</h3>
              <p>Administrators</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon new">
              <UserPlus />
            </div>
            <div className="stat-content">
              <h3>{stats.newUsersThisMonth}</h3>
              <p>New This Month</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon google">
              <BarChart3 />
            </div>
            <div className="stat-content">
              <h3>{stats.usersWithGoogleAuth}</h3>
              <p>Google Auth</p>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="admin-users">
        <div className="users-header">
          <h2>Registered Users</h2>
          <button className="refresh-btn" onClick={loadData}>
            Refresh
          </button>
        </div>

        <div className="users-table">
          <div className="table-header">
            <div className="th">User</div>
            <div className="th">Email</div>
            <div className="th">Role</div>
            <div className="th">Status</div>
            <div className="th">Created</div>
            <div className="th">Last Login</div>
            <div className="th">Actions</div>
          </div>

          {users.map(user => (
            <div key={user.id} className="table-row">
              <div className="td user-info">
                <div className="user-avatar">
                  {user.profile_picture ? (
                    <img src={user.profile_picture} alt={user.display_name || user.email} />
                  ) : (
                    <div className="avatar-placeholder">
                      {(user.display_name || user.email).charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <div className="user-name">{user.display_name || user.username || 'No name'}</div>
                  <div className="user-id">ID: {user.id.slice(0, 8)}...</div>
                </div>
              </div>
              <div className="td">{user.email}</div>
              <div className="td">
                <div className="role-badge">
                  {getRoleIcon(user.role)}
                  {user.role}
                </div>
              </div>
              <div className="td">
                <div className="status-badge">
                  {getStatusIcon(user.is_active)}
                  {user.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
              <div className="td">{formatDate(user.created_at)}</div>
              <div className="td">{user.last_login ? formatDate(user.last_login) : 'Never'}</div>
              <div className="td">
                <div className="action-buttons">
                  <button 
                    className="btn-action btn-toggle"
                    onClick={() => handleToggleUserStatus(user.id)}
                    title={user.is_active ? 'Deactivate User' : 'Activate User'}
                  >
                    {user.is_active ? <UserX /> : <UserCheck />}
                  </button>
                  
                  {user.role === 'user' ? (
                    <button 
                      className="btn-action btn-promote"
                      onClick={() => handlePromoteToAdmin(user.id)}
                      title="Promote to Admin"
                    >
                      <Crown />
                    </button>
                  ) : (
                    <button 
                      className="btn-action btn-demote"
                      onClick={() => handleDemoteToUser(user.id)}
                      title="Demote to User"
                      disabled={user.id === currentUser.id}
                    >
                      <Users />
                    </button>
                  )}
                  
                  <button 
                    className="btn-action btn-delete"
                    onClick={() => handleDeleteUser(user.id)}
                    title="Delete User"
                    disabled={user.id === currentUser.id}
                  >
                    <Trash2 />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {users.length === 0 && (
          <div className="no-users">
            <Users className="no-users-icon" />
            <p>No users found</p>
          </div>
        )}
      </div>
    </div>
  );
};