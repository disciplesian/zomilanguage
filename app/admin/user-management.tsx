import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Animated,
  Modal,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Users,
  Search,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserCog,
  Trash2,
  Ban,
  CheckCircle,
  X,
  Edit3,
  Crown,
  UserX,
  UserCheck,
  RefreshCw,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import GlassCard from '@/components/GlassCard';
import Colors from '@/constants/colors';
import { useAuth, UserListItem } from '@/contexts/AuthContext';

type UserRole = 'user' | 'editor' | 'moderator' | 'admin';

const roleColors: Record<UserRole, string> = {
  user: Colors.textSecondary,
  editor: Colors.primary,
  moderator: Colors.accent,
  admin: Colors.tertiary,
};

const roleLabels: Record<UserRole, string> = {
  user: 'User',
  editor: 'Editor',
  moderator: 'Moderator',
  admin: 'Admin',
};

export default function UserManagementScreen() {
  const router = useRouter();
  const { user, getAllUsers, updateUserRole, banUser, unbanUser, deleteUser, updateUserDetails } = useAuth();
  
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [banReason, setBanReason] = useState('');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const isAdmin = user?.role === 'admin';

  const loadUsers = useCallback(async () => {
    try {
      console.log('Loading users...');
      const allUsers = await getAllUsers();
      setUsers(allUsers);
      setFilteredUsers(allUsers);
      console.log('Loaded', allUsers.length, 'users');
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [getAllUsers]);

  useEffect(() => {
    loadUsers();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [loadUsers, fadeAnim]);

  useEffect(() => {
    let filtered = users;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
      );
    }
    
    if (filterRole !== 'all') {
      filtered = filtered.filter(u => u.role === filterRole);
    }
    
    setFilteredUsers(filtered);
  }, [searchQuery, filterRole, users]);

  const handleRefresh = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsRefreshing(true);
    await loadUsers();
  }, [loadUsers]);

  const handleRoleChange = useCallback(async (newRole: UserRole) => {
    if (!selectedUser) return;
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    const result = await updateUserRole(selectedUser.userId, newRole);
    
    if (result.success) {
      setUsers(prev => prev.map(u => 
        u.userId === selectedUser.userId ? { ...u, role: newRole } : u
      ));
      setShowRoleModal(false);
      setSelectedUser(null);
      Alert.alert('Success', `User role updated to ${roleLabels[newRole]}`);
    } else {
      Alert.alert('Error', result.error || 'Failed to update role');
    }
  }, [selectedUser, updateUserRole]);

  const handleBanUser = useCallback(async () => {
    if (!selectedUser || !banReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for banning');
      return;
    }
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    
    const result = await banUser(selectedUser.userId, banReason.trim());
    
    if (result.success) {
      setUsers(prev => prev.map(u => 
        u.userId === selectedUser.userId ? { ...u, isBanned: true, banReason: banReason.trim() } : u
      ));
      setShowBanModal(false);
      setSelectedUser(null);
      setBanReason('');
      Alert.alert('Success', 'User has been banned');
    } else {
      Alert.alert('Error', result.error || 'Failed to ban user');
    }
  }, [selectedUser, banReason, banUser]);

  const handleUnbanUser = useCallback(async (targetUser: UserListItem) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    const result = await unbanUser(targetUser.userId);
    
    if (result.success) {
      setUsers(prev => prev.map(u => 
        u.userId === targetUser.userId ? { ...u, isBanned: false, banReason: undefined } : u
      ));
      Alert.alert('Success', 'User has been unbanned');
    } else {
      Alert.alert('Error', result.error || 'Failed to unban user');
    }
  }, [unbanUser]);

  const handleDeleteUser = useCallback(async () => {
    if (!selectedUser) return;
    
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    
    const result = await deleteUser(selectedUser.userId);
    
    if (result.success) {
      setUsers(prev => prev.filter(u => u.userId !== selectedUser.userId));
      setShowDeleteModal(false);
      setSelectedUser(null);
      Alert.alert('Success', 'User has been deleted');
    } else {
      Alert.alert('Error', result.error || 'Failed to delete user');
    }
  }, [selectedUser, deleteUser]);

  const handleEditUser = useCallback(async () => {
    if (!selectedUser) return;
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    const updates: { name?: string; email?: string } = {};
    if (editName.trim() && editName !== selectedUser.name) {
      updates.name = editName.trim();
    }
    if (editEmail.trim() && editEmail !== selectedUser.email) {
      updates.email = editEmail.trim();
    }
    
    if (Object.keys(updates).length === 0) {
      setShowEditModal(false);
      return;
    }
    
    const result = await updateUserDetails(selectedUser.userId, updates);
    
    if (result.success) {
      setUsers(prev => prev.map(u => 
        u.userId === selectedUser.userId ? { ...u, ...updates } : u
      ));
      setShowEditModal(false);
      setSelectedUser(null);
      Alert.alert('Success', 'User details updated');
    } else {
      Alert.alert('Error', result.error || 'Failed to update user');
    }
  }, [selectedUser, editName, editEmail, updateUserDetails]);

  const openRoleModal = useCallback((targetUser: UserListItem) => {
    setSelectedUser(targetUser);
    setShowRoleModal(true);
  }, []);

  const openEditModal = useCallback((targetUser: UserListItem) => {
    setSelectedUser(targetUser);
    setEditName(targetUser.name);
    setEditEmail(targetUser.email);
    setShowEditModal(true);
  }, []);

  const openBanModal = useCallback((targetUser: UserListItem) => {
    setSelectedUser(targetUser);
    setBanReason('');
    setShowBanModal(true);
  }, []);

  const openDeleteModal = useCallback((targetUser: UserListItem) => {
    setSelectedUser(targetUser);
    setShowDeleteModal(true);
  }, []);

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Crown size={16} color={roleColors.admin} />;
      case 'moderator':
        return <ShieldCheck size={16} color={roleColors.moderator} />;
      case 'editor':
        return <Edit3 size={16} color={roleColors.editor} />;
      default:
        return <Users size={16} color={roleColors.user} />;
    }
  };

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'User Management' }} />
        <LinearGradient
          colors={[Colors.background, Colors.backgroundTertiary, Colors.background]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.accessDenied}>
          <ShieldAlert size={64} color={Colors.error} />
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedText}>
            Only administrators can access user management.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'User Management' }} />
        <LinearGradient
          colors={[Colors.background, Colors.backgroundTertiary, Colors.background]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'User Management' }} />
      <LinearGradient
        colors={[Colors.background, Colors.backgroundTertiary, Colors.background]}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={styles.gradientOrbs}>
        <View style={[styles.orb, styles.orbPurple]} />
        <View style={[styles.orb, styles.orbCyan]} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.header}>
            <LinearGradient
              colors={['rgba(108, 92, 231, 0.4)', 'rgba(0, 217, 255, 0.4)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerIcon}
            >
              <UserCog size={26} color={Colors.text} />
            </LinearGradient>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>User Management</Text>
              <Text style={styles.headerSubtitle}>{users.length} registered users</Text>
            </View>
            <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
              {isRefreshing ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <RefreshCw size={20} color={Colors.primary} />
              )}
            </TouchableOpacity>
          </View>

          <GlassCard style={styles.searchCard}>
            <View style={styles.searchContainer}>
              <Search size={20} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or email..."
                placeholderTextColor={Colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
          </GlassCard>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
            contentContainerStyle={styles.filterContent}
          >
            {(['all', 'user', 'editor', 'moderator', 'admin'] as const).map((role) => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.filterChip,
                  filterRole === role && styles.filterChipActive,
                ]}
                onPress={() => setFilterRole(role)}
              >
                <Text style={[
                  styles.filterChipText,
                  filterRole === role && styles.filterChipTextActive,
                ]}>
                  {role === 'all' ? 'All' : roleLabels[role]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.userList}>
            {filteredUsers.length === 0 ? (
              <GlassCard style={styles.emptyCard}>
                <Users size={48} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No users found</Text>
              </GlassCard>
            ) : (
              filteredUsers.map((targetUser) => (
                <GlassCard key={targetUser.userId} style={styles.userCard}>
                  <View style={styles.userHeader}>
                    <View style={styles.userAvatarContainer}>
                      {targetUser.avatar ? (
                        <Image source={{ uri: targetUser.avatar }} style={styles.userAvatar} />
                      ) : (
                        <View style={styles.userAvatarPlaceholder}>
                          <Text style={styles.userAvatarText}>
                            {targetUser.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      {targetUser.isBanned && (
                        <View style={styles.bannedBadge}>
                          <Ban size={10} color={Colors.text} />
                        </View>
                      )}
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{targetUser.name}</Text>
                      <Text style={styles.userEmail}>{targetUser.email}</Text>
                      <View style={styles.userBadges}>
                        <View style={[styles.roleBadge, { borderColor: roleColors[targetUser.role] }]}>
                          {getRoleIcon(targetUser.role)}
                          <Text style={[styles.roleBadgeText, { color: roleColors[targetUser.role] }]}>
                            {roleLabels[targetUser.role]}
                          </Text>
                        </View>
                        {targetUser.isVerified && (
                          <View style={styles.verifiedBadge}>
                            <CheckCircle size={12} color={Colors.success} />
                          </View>
                        )}
                        {targetUser.isPremium && (
                          <View style={styles.premiumBadge}>
                            <Crown size={12} color={Colors.accent} />
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  
                  {targetUser.isBanned && targetUser.banReason && (
                    <View style={styles.banReasonContainer}>
                      <Text style={styles.banReasonLabel}>Ban reason:</Text>
                      <Text style={styles.banReasonText}>{targetUser.banReason}</Text>
                    </View>
                  )}
                  
                  {targetUser.role !== 'admin' && (
                    <View style={styles.userActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.roleButton]}
                        onPress={() => openRoleModal(targetUser)}
                      >
                        <Shield size={16} color={Colors.primary} />
                        <Text style={styles.actionButtonText}>Role</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.actionButton, styles.editButton]}
                        onPress={() => openEditModal(targetUser)}
                      >
                        <Edit3 size={16} color={Colors.accent} />
                        <Text style={styles.actionButtonText}>Edit</Text>
                      </TouchableOpacity>
                      
                      {targetUser.isBanned ? (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.unbanButton]}
                          onPress={() => handleUnbanUser(targetUser)}
                        >
                          <UserCheck size={16} color={Colors.success} />
                          <Text style={styles.actionButtonText}>Unban</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.banButton]}
                          onPress={() => openBanModal(targetUser)}
                        >
                          <UserX size={16} color={Colors.warning} />
                          <Text style={styles.actionButtonText}>Ban</Text>
                        </TouchableOpacity>
                      )}
                      
                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => openDeleteModal(targetUser)}
                      >
                        <Trash2 size={16} color={Colors.error} />
                        <Text style={[styles.actionButtonText, { color: Colors.error }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  
                  {targetUser.role === 'admin' && (
                    <View style={styles.adminNotice}>
                      <Shield size={14} color={Colors.tertiary} />
                      <Text style={styles.adminNoticeText}>Admin accounts cannot be modified</Text>
                    </View>
                  )}
                </GlassCard>
              ))
            )}
          </View>
        </Animated.View>
      </ScrollView>

      <Modal
        visible={showRoleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRoleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Role</Text>
              <TouchableOpacity onPress={() => setShowRoleModal(false)}>
                <X size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Select new role for {selectedUser?.name}
            </Text>
            <View style={styles.roleOptions}>
              {(['user', 'editor', 'moderator', 'admin'] as UserRole[]).map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleOption,
                    selectedUser?.role === role && styles.roleOptionSelected,
                  ]}
                  onPress={() => handleRoleChange(role)}
                >
                  {getRoleIcon(role)}
                  <Text style={[styles.roleOptionText, { color: roleColors[role] }]}>
                    {roleLabels[role]}
                  </Text>
                  {selectedUser?.role === role && (
                    <CheckCircle size={18} color={Colors.success} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>
        </View>
      </Modal>

      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit User</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.editForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter name"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.textInput}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="Enter email"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <TouchableOpacity style={styles.saveButton} onPress={handleEditUser}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>

      <Modal
        visible={showBanModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBanModal(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ban User</Text>
              <TouchableOpacity onPress={() => setShowBanModal(false)}>
                <X size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Ban {selectedUser?.name}?
            </Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Reason for ban</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={banReason}
                onChangeText={setBanReason}
                placeholder="Enter reason..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowBanModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.banConfirmButton} onPress={handleBanUser}>
                <Ban size={16} color={Colors.text} />
                <Text style={styles.banConfirmText}>Ban User</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete User</Text>
              <TouchableOpacity onPress={() => setShowDeleteModal(false)}>
                <X size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.deleteWarning}>
              <Trash2 size={48} color={Colors.error} />
              <Text style={styles.deleteWarningTitle}>Are you sure?</Text>
              <Text style={styles.deleteWarningText}>
                This will permanently delete {selectedUser?.name} account and all associated data. This action cannot be undone.
              </Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteConfirmButton} onPress={handleDeleteUser}>
                <Trash2 size={16} color={Colors.text} />
                <Text style={styles.deleteConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gradientOrbs: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    opacity: 0.15,
  },
  orbPurple: {
    backgroundColor: Colors.tertiary,
    top: -120,
    right: -100,
  },
  orbCyan: {
    backgroundColor: Colors.primary,
    bottom: 100,
    left: -150,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 14,
  },
  headerIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchCard: {
    marginBottom: 16,
    padding: 0,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterContent: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  filterChipTextActive: {
    color: Colors.text,
  },
  userList: {
    gap: 12,
  },
  userCard: {
    padding: 16,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  userAvatarContainer: {
    position: 'relative',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.glassPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.tertiary,
  },
  bannedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  userBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  verifiedBadge: {
    padding: 4,
  },
  premiumBadge: {
    padding: 4,
  },
  banReasonContainer: {
    marginTop: 12,
    padding: 10,
    backgroundColor: 'rgba(255, 94, 94, 0.25)',
    borderRadius: 8,
  },
  banReasonLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.error,
    marginBottom: 2,
  },
  banReasonText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  roleButton: {
    backgroundColor: Colors.glassCyan,
  },
  editButton: {
    backgroundColor: Colors.glassYellow,
  },
  banButton: {
    backgroundColor: Colors.glassYellow,
  },
  unbanButton: {
    backgroundColor: Colors.glassGreen,
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 94, 94, 0.25)',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  adminNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 10,
    backgroundColor: Colors.glassPurple,
    borderRadius: 8,
  },
  adminNoticeText: {
    fontSize: 12,
    color: Colors.tertiary,
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  accessDenied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.error,
  },
  accessDeniedText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  roleOptions: {
    gap: 8,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  roleOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.glassCyan,
  },
  roleOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500' as const,
  },
  editForm: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  banConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.warning,
  },
  banConfirmText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  deleteWarning: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  deleteWarningTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.error,
  },
  deleteWarningText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  deleteConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.error,
  },
  deleteConfirmText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
});
