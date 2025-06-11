/**
 * Collaboration Store
 * Manages real-time collaborative playlist editing state using Zustand
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Timestamp } from 'firebase/firestore';
import {
  CollaborationStore,
  CollaborativePlaylist,
  CollaborationInvitation,
  PlaylistOperation,
  CollaborationNotification,
  UserCursor,
  UserPresenceStatus,
  CollaborationPermission,
  ConflictResolution,
  CreateCollaborativePlaylistInput
} from '../types/collaboration';
import { collaborationFirebaseService } from '../services/collaborationFirebaseService';
import { authService } from '../services/authService';
import { emailService } from '../services/emailService';

// ==================== DEFAULT STATE ====================

const defaultState = {
  // Active collaborations
  activeCollaborations: {},
  
  // User presence
  userPresence: {},
  
  // Invitations
  sentInvitations: [],
  receivedInvitations: [],
  
  // Notifications
  notifications: [],
  unreadNotificationCount: 0,
  
  // Real-time connection status
  connectionStatus: 'disconnected' as const,
  
  // Loading states
  isLoading: false,
  isJoiningCollaboration: false,
  isSendingInvitation: false,
  
  // Error handling
  lastError: null,
  
  // Current user context
  currentUserId: authService.getCurrentUser()?.uid || null,
  currentUserDisplayName: authService.getCurrentUser()?.displayName || null
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Generate unique colors for user cursors
 */
const generateUserColor = (userId: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Generate operation ID
 */
const generateOperationId = (): string => {
  return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generate invite code
 */
const generateInviteCode = (): string => {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
};

// ==================== ZUSTAND STORE ====================

export const useCollaborationStore = create<CollaborationStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...defaultState,

        // ==================== PLAYLIST MANAGEMENT ====================

        convertToCollaborative: async (sourcePlaylist: any, sourceType: 'regular' | 'youtube') => {
          const currentUser = authService.getCurrentUser();
          if (!currentUser) {
            set((draft) => {
              draft.lastError = 'User must be authenticated to convert playlists';
            });
            return null;
          }

          if (!collaborationFirebaseService.isAvailable()) {
            set((draft) => {
              draft.lastError = 'Firebase not available for collaboration features';
            });
            return null;
          }

          set((draft) => {
            draft.isLoading = true;
            draft.lastError = null;
          });

          try {
            console.log(`🔄 Converting ${sourceType} playlist "${sourcePlaylist.name}" to collaborative...`);

            const playlistId = await collaborationFirebaseService.convertToCollaborative(sourcePlaylist, sourceType);

            if (playlistId) {
              // Subscribe to the new collaborative playlist
              get().subscribeToCollaborativePlaylist(playlistId);

              set((draft) => {
                draft.isLoading = false;
              });

              console.log('✅ Playlist converted to collaborative:', playlistId);
              return playlistId;
            } else {
              throw new Error('Failed to convert playlist to collaborative');
            }
          } catch (error: any) {
            console.error('❌ Error converting playlist:', error);
            set((draft) => {
              draft.isLoading = false;
              draft.lastError = error.message || 'Failed to convert playlist to collaborative';
            });
            return null;
          }
        },

        createCollaborativePlaylist: async (input: CreateCollaborativePlaylistInput) => {
          const currentUser = authService.getCurrentUser();
          if (!currentUser) {
            set((draft) => {
              draft.lastError = 'User must be authenticated to create collaborative playlists';
            });
            return '';
          }

          set((draft) => {
            draft.isLoading = true;
            draft.lastError = null;
          });

          try {
            const inviteCode = generateInviteCode();
            
            // Create base playlist data
            const basePlaylistData = {
              name: input.name,
              description: input.description,
              type: input.type,
              isCollaborative: true,
              status: 'active',
              ownerId: currentUser.uid,
              collaborators: {},
              defaultPermission: input.defaultPermission,
              inviteCode,
              isPublic: input.isPublic,
              version: 1,
              operationHistory: [],
              activeUsers: [],
              clips: input.initialClips || [],
              date: new Date().toISOString(),
              lastCollaborativeActivity: Timestamp.now()
            };

            // Add optional fields only if they have values (Firebase doesn't allow undefined)
            const playlistData: Omit<CollaborativePlaylist, 'id' | 'createdAt' | 'updatedAt' | 'collaborationId'> = {
              ...basePlaylistData,
              ...(input.drinkingSoundPath && { drinkingSoundPath: input.drinkingSoundPath }),
              ...(input.imagePath && { imagePath: input.imagePath })
            };

            const playlistId = await collaborationFirebaseService.createCollaborativePlaylist(playlistData);
            
            if (playlistId) {
              // Subscribe to the new playlist
              get().subscribeToCollaborativePlaylist(playlistId);
              
              set((draft) => {
                draft.isLoading = false;
              });
              
              console.log('✅ Collaborative playlist created:', playlistId);
              return playlistId;
            } else {
              throw new Error('Failed to create collaborative playlist');
            }
          } catch (error: any) {
            console.error('❌ Error creating collaborative playlist:', error);
            set((draft) => {
              draft.isLoading = false;
              draft.lastError = error.message || 'Failed to create collaborative playlist';
            });
            return '';
          }
        },

        joinCollaboration: async (inviteCode: string) => {
          const currentUser = authService.getCurrentUser();
          if (!currentUser) {
            set((draft) => {
              draft.lastError = 'User must be authenticated to join collaborations';
            });
            return false;
          }

          if (!collaborationFirebaseService.isAvailable()) {
            set((draft) => {
              draft.lastError = 'Firebase not available for collaboration features';
            });
            return false;
          }

          set((draft) => {
            draft.isJoiningCollaboration = true;
            draft.lastError = null;
          });

          try {
            console.log('🔄 Joining collaboration with invite code:', inviteCode);

            const playlistId = await collaborationFirebaseService.joinWithInviteCode(inviteCode);

            if (playlistId) {
              // Subscribe to the joined playlist
              get().subscribeToCollaborativePlaylist(playlistId);

              // Refresh collaborations to show the new playlist
              await get().refreshCollaborations();

              set((draft) => {
                draft.isJoiningCollaboration = false;
              });

              console.log('✅ Successfully joined collaboration:', playlistId);
              return true;
            } else {
              throw new Error('Invalid invite code or playlist not found');
            }
          } catch (error: any) {
            console.error('❌ Error joining collaboration:', error);
            set((draft) => {
              draft.isJoiningCollaboration = false;
              draft.lastError = error.message || 'Failed to join collaboration';
            });
            return false;
          }
        },

        leaveCollaboration: async (playlistId: string) => {
          const currentUser = authService.getCurrentUser();
          if (!currentUser) {
            return false;
          }

          try {
            await collaborationFirebaseService.removeCollaborator(playlistId, currentUser.uid);

            // Unsubscribe from playlist updates
            collaborationFirebaseService.unsubscribeFromPlaylist(playlistId);

            set((draft) => {
              delete draft.activeCollaborations[playlistId];
              delete draft.userPresence[playlistId];
            });

            console.log('✅ Left collaboration:', playlistId);
            return true;
          } catch (error: any) {
            console.error('❌ Error leaving collaboration:', error);
            set((draft) => {
              draft.lastError = error.message || 'Failed to leave collaboration';
            });
            return false;
          }
        },

        deleteCollaborativePlaylist: async (playlistId: string) => {
          const currentUser = authService.getCurrentUser();
          if (!currentUser) {
            set((draft) => {
              draft.lastError = 'User must be authenticated to delete collaborative playlists';
            });
            return false;
          }

          try {
            const success = await collaborationFirebaseService.deleteCollaborativePlaylist(playlistId);

            if (success) {
              // Unsubscribe from playlist updates
              collaborationFirebaseService.unsubscribeFromPlaylist(playlistId);

              set((draft) => {
                delete draft.activeCollaborations[playlistId];
                delete draft.userPresence[playlistId];
              });

              console.log('✅ Deleted collaborative playlist:', playlistId);
            }

            return success;
          } catch (error: any) {
            console.error('❌ Error deleting collaborative playlist:', error);
            set((draft) => {
              draft.lastError = error.message || 'Failed to delete collaborative playlist';
            });
            return false;
          }
        },

        // ==================== OPERATIONS ====================

        applyOperation: async (playlistId: string, operation: Omit<PlaylistOperation, 'id' | 'timestamp'>) => {
          const currentUser = authService.getCurrentUser();
          if (!currentUser) {
            return false;
          }

          try {
            const operationWithId = {
              ...operation,
              id: generateOperationId(),
              userId: currentUser.uid,
              vectorClock: { [currentUser.uid]: Date.now() },
              dependencies: [],
              timestamp: new Date() as any // Will be replaced by serverTimestamp in Firebase
            };

            const success = await collaborationFirebaseService.applyOperation(playlistId, operationWithId);

            if (success) {
              // Optimistically update local state
              set((draft) => {
                const playlist = draft.activeCollaborations[playlistId];
                if (playlist) {
                  playlist.operationHistory.push(operationWithId as PlaylistOperation);
                  playlist.version += 1;
                }
              });
            }
            
            return success;
          } catch (error: any) {
            console.error('❌ Error applying operation:', error);
            set((draft) => {
              draft.lastError = error.message || 'Failed to apply operation';
            });
            return false;
          }
        },

        resolveConflict: async (playlistId: string, resolution: ConflictResolution) => {
          try {
            // TODO: Implement conflict resolution logic
            console.log('🔄 Resolving conflict for playlist:', playlistId, resolution);
            return true;
          } catch (error: any) {
            console.error('❌ Error resolving conflict:', error);
            set((draft) => {
              draft.lastError = error.message || 'Failed to resolve conflict';
            });
            return false;
          }
        },

        // ==================== INVITATIONS ====================

        sendInvitation: async (invitation: Omit<CollaborationInvitation, 'id' | 'createdAt' | 'status'>) => {
          const currentUser = authService.getCurrentUser();
          if (!currentUser) {
            set((draft) => {
              draft.lastError = 'User must be authenticated to send invitations';
            });
            return false;
          }

          set((draft) => {
            draft.isSendingInvitation = true;
            draft.lastError = null;
          });

          try {
            // Create the invitation in Firebase
            const success = await collaborationFirebaseService.sendInvitation(invitation);

            if (success) {
              console.log('✅ Invitation created successfully');

              // Create in-app notification for the invitee instead of sending email
              const notificationSuccess = await collaborationFirebaseService.createInvitationNotification({
                playlistId: invitation.playlistId,
                playlistName: invitation.playlistName,
                inviterUserId: currentUser.uid,
                inviterName: currentUser.displayName || currentUser.email || 'A collaborator',
                inviteeEmail: invitation.inviteeEmail || '',
                permission: invitation.permission === 'owner' ? 'editor' : invitation.permission,
                inviteCode: invitation.inviteCode,
                message: invitation.message
              });

              if (notificationSuccess) {
                console.log('✅ In-app invitation notification created');
              } else {
                console.warn('⚠️ Invitation created but notification failed');
              }

              // Refresh invitations
              get().refreshInvitations();
            }

            set((draft) => {
              draft.isSendingInvitation = false;
            });

            return success;
          } catch (error: any) {
            console.error('❌ Error sending invitation:', error);
            set((draft) => {
              draft.isSendingInvitation = false;
              draft.lastError = error.message || 'Failed to send invitation';
            });
            return false;
          }
        },

        respondToInvitation: async (invitationId: string, response: 'accept' | 'decline') => {
          try {
            const success = await collaborationFirebaseService.respondToInvitation(invitationId, response);
            
            if (success) {
              // Update local invitation status
              set((draft) => {
                const invitation = draft.receivedInvitations.find(inv => inv.id === invitationId);
                if (invitation) {
                  invitation.status = response === 'accept' ? 'accepted' : 'declined';
                  invitation.respondedAt = new Date() as any;
                }
              });
              
              // If accepted, refresh collaborations
              if (response === 'accept') {
                get().refreshCollaborations();
              }
            }
            
            return success;
          } catch (error: any) {
            console.error('❌ Error responding to invitation:', error);
            set((draft) => {
              draft.lastError = error.message || 'Failed to respond to invitation';
            });
            return false;
          }
        },

        // ==================== USER PRESENCE ====================

        updateUserPresence: (playlistId: string, presence: Partial<UserCursor>) => {
          const currentUser = authService.getCurrentUser();
          if (!currentUser) {
            return;
          }

          const fullPresence: Omit<UserCursor, 'timestamp'> = {
            userId: currentUser.uid,
            displayName: currentUser.displayName || 'Unknown User',
            color: generateUserColor(currentUser.uid),
            position: { action: 'viewing' },
            ...presence
          };

          // Update Firebase
          collaborationFirebaseService.updateUserPresence(playlistId, fullPresence);

          // Update local state
          set((draft) => {
            if (!draft.userPresence[playlistId]) {
              draft.userPresence[playlistId] = {};
            }
            draft.userPresence[playlistId][currentUser.uid] = {
              ...fullPresence,
              timestamp: new Date() as any
            };
          });
        },

        setUserStatus: (status: UserPresenceStatus) => {
          const currentUser = authService.getCurrentUser();
          if (!currentUser) {
            return;
          }

          // Update presence for all active collaborations
          const state = get();
          Object.keys(state.activeCollaborations).forEach(playlistId => {
            get().updateUserPresence(playlistId, { 
              position: { action: status === 'online' ? 'viewing' : 'selecting' }
            });
          });
        },

        // ==================== PLAYLIST UPDATES ====================

        updateCollaborativePlaylistMetadata: async (playlistId: string, metadata: { name?: string; description?: string }) => {
          const currentUser = authService.getCurrentUser();
          if (!currentUser) {
            set((draft) => {
              draft.lastError = 'User must be authenticated to update playlists';
            });
            return false;
          }

          try {
            const success = await collaborationFirebaseService.updateCollaborativePlaylist(playlistId, metadata);

            if (success) {
              // Update local state
              set((draft) => {
                const playlist = draft.activeCollaborations[playlistId];
                if (playlist) {
                  if (metadata.name) playlist.name = metadata.name;
                  if (metadata.description !== undefined) playlist.description = metadata.description;
                }
              });
              console.log('✅ Collaborative playlist metadata updated');
            }

            return success;
          } catch (error: any) {
            console.error('❌ Error updating collaborative playlist metadata:', error);
            set((draft) => {
              draft.lastError = error.message || 'Failed to update playlist metadata';
            });
            return false;
          }
        },

        // ==================== PERMISSIONS ====================

        updateCollaboratorPermission: async (playlistId: string, userId: string, permission: CollaborationPermission) => {
          try {
            // TODO: Implement permission update logic
            console.log('🔄 Updating collaborator permission:', { playlistId, userId, permission });
            return true;
          } catch (error: any) {
            console.error('❌ Error updating collaborator permission:', error);
            set((draft) => {
              draft.lastError = error.message || 'Failed to update collaborator permission';
            });
            return false;
          }
        },

        removeCollaborator: async (playlistId: string, userId: string) => {
          try {
            const success = await collaborationFirebaseService.removeCollaborator(playlistId, userId);

            if (success) {
              set((draft) => {
                const playlist = draft.activeCollaborations[playlistId];
                if (playlist && playlist.collaborators[userId]) {
                  delete playlist.collaborators[userId];
                  playlist.activeUsers = playlist.activeUsers.filter(id => id !== userId);
                }

                // Remove from presence
                if (draft.userPresence[playlistId] && draft.userPresence[playlistId][userId]) {
                  delete draft.userPresence[playlistId][userId];
                }
              });
            }

            return success;
          } catch (error: any) {
            console.error('❌ Error removing collaborator:', error);
            set((draft) => {
              draft.lastError = error.message || 'Failed to remove collaborator';
            });
            return false;
          }
        },

        // ==================== NOTIFICATIONS ====================

        markNotificationAsRead: (notificationId: string) => {
          // Update Firebase
          collaborationFirebaseService.markNotificationAsRead(notificationId);

          // Update local state
          set((draft) => {
            const notification = draft.notifications.find(n => n.id === notificationId);
            if (notification && !notification.isRead) {
              notification.isRead = true;
              draft.unreadNotificationCount = Math.max(0, draft.unreadNotificationCount - 1);
            }
          });
        },

        markAllNotificationsAsRead: () => {
          set((draft) => {
            draft.notifications.forEach(notification => {
              notification.isRead = true;
            });
            draft.unreadNotificationCount = 0;
          });
        },

        clearNotifications: () => {
          set((draft) => {
            draft.notifications = [];
            draft.unreadNotificationCount = 0;
          });
        },

        // ==================== UTILITY ====================

        refreshCollaborations: async () => {
          // Check if Firebase is available and user is authenticated
          if (!collaborationFirebaseService.isAvailable()) {
            console.log('🔄 Firebase not available, skipping collaboration refresh');
            return;
          }

          const currentUser = authService.getCurrentUser();
          if (!currentUser) {
            console.log('🔄 No authenticated user, skipping collaboration refresh');
            return;
          }

          set((draft) => {
            draft.isLoading = true;
            draft.lastError = null;
          });

          try {
            console.log('🔄 Refreshing collaborations for user:', currentUser.uid);

            // Load user's collaborative playlists
            const collaborativePlaylists = await collaborationFirebaseService.getUserCollaborations();

            // Subscribe to each playlist for real-time updates
            collaborativePlaylists.forEach(playlist => {
              try {
                get().subscribeToCollaborativePlaylist(playlist.id);
              } catch (subscribeError) {
                console.warn('⚠️ Failed to subscribe to playlist:', playlist.id, subscribeError);
              }
            });

            console.log(`✅ Loaded and subscribed to ${collaborativePlaylists.length} collaborative playlists`);

            set((draft) => {
              draft.isLoading = false;
            });
          } catch (error: any) {
            console.error('❌ Error refreshing collaborations:', error);
            set((draft) => {
              draft.isLoading = false;
              draft.lastError = error.message || 'Failed to refresh collaborations';
            });
          }
        },



        clearError: () => {
          set((draft) => {
            draft.lastError = null;
          });
        },

        // ==================== REAL-TIME SUBSCRIPTIONS ====================

        unsubscribeFromPlaylist: (playlistId: string) => {
          collaborationFirebaseService.unsubscribeFromPlaylist(playlistId);

          set((draft) => {
            delete draft.activeCollaborations[playlistId];
            delete draft.userPresence[playlistId];
          });
        },

        // ==================== INITIALIZATION ====================

        initialize: async () => {
          const currentUser = authService.getCurrentUser();
          if (!currentUser) {
            console.log('🤝 No authenticated user, skipping collaboration initialization');
            return;
          }

          // Check if Firebase is available
          if (!collaborationFirebaseService.isAvailable()) {
            console.log('🤝 Firebase not available, skipping collaboration initialization');
            return;
          }

          console.log('🤝 Initializing collaboration store for user:', currentUser.uid);

          set((draft) => {
            draft.currentUserId = currentUser.uid;
            draft.currentUserDisplayName = currentUser.displayName || null;
            draft.connectionStatus = 'connecting';
          });

          try {
            // Load user's collaborations and invitations
            await get().refreshCollaborations();
            await get().refreshInvitations();

            // Subscribe to real-time notifications
            collaborationFirebaseService.subscribeToNotifications((notifications) => {
              set((draft) => {
                draft.notifications = notifications;
                draft.unreadNotificationCount = notifications.filter(n => !n.isRead).length;
              });
            });

            // Subscribe to real-time invitations
            collaborationFirebaseService.subscribeToInvitations((invitations) => {
              set((draft) => {
                draft.receivedInvitations = invitations;
                // Update unread count to include pending invitations
                const unreadNotifications = draft.notifications.filter(n => !n.isRead).length;
                const pendingInvitations = invitations.filter(inv => inv.status === 'pending').length;
                draft.unreadNotificationCount = unreadNotifications + pendingInvitations;
              });
            });

            set((draft) => {
              draft.connectionStatus = 'connected';
            });

            console.log('✅ Collaboration store initialized successfully');
          } catch (error: any) {
            console.error('❌ Error initializing collaboration store:', error);
            set((draft) => {
              draft.connectionStatus = 'error';
              draft.lastError = error.message || 'Failed to initialize collaboration features';
            });
          }
        },

        // Subscription methods
        subscribeToCollaborativePlaylist: (playlistId: string) => {
          // Use the existing subscribeToPlaylist method
          get().subscribeToPlaylist(playlistId);
        },

        subscribeToPlaylist: (playlistId: string) => {
          if (!collaborationFirebaseService.isAvailable()) {
            console.warn('⚠️ Cannot subscribe to playlist - Firebase not available');
            return;
          }

          try {
            // Subscribe to playlist changes
            collaborationFirebaseService.subscribeToPlaylist(playlistId, (playlist) => {
              set((draft) => {
                if (playlist) {
                  draft.activeCollaborations[playlistId] = playlist;
                  draft.connectionStatus = 'connected';
                } else {
                  delete draft.activeCollaborations[playlistId];
                }
              });
            });

            // Subscribe to operations
            collaborationFirebaseService.subscribeToOperations(playlistId, (operations) => {
              set((draft) => {
                const playlist = draft.activeCollaborations[playlistId];
                if (playlist) {
                  playlist.operationHistory = operations;
                }
              });
            });

            // Subscribe to user presence
            collaborationFirebaseService.subscribeToPresence(playlistId, (presence) => {
              set((draft) => {
                draft.userPresence[playlistId] = presence;
              });
            });

            console.log('✅ Subscribed to playlist:', playlistId);
          } catch (error) {
            console.error('❌ Failed to subscribe to playlist:', playlistId, error);
          }
        },

        refreshInvitations: async () => {
          try {
            const { sent, received } = await collaborationFirebaseService.getUserInvitations();

            set((draft) => {
              draft.sentInvitations = sent;
              draft.receivedInvitations = received;

              // Update unread notification count
              draft.unreadNotificationCount = received.filter(inv => inv.status === 'pending').length;
            });
          } catch (error: any) {
            console.error('❌ Error refreshing invitations:', error);
            set((draft) => {
              draft.lastError = error.message || 'Failed to refresh invitations';
            });
          }
        },

        cleanup: () => {
          collaborationFirebaseService.unsubscribeAll();

          set((draft) => {
            draft.activeCollaborations = {};
            draft.userPresence = {};
            draft.connectionStatus = 'disconnected';
          });
        }
      }))
    ),
    {
      name: 'collaboration-store'
    }
  )
);

// ==================== HOOKS ====================

/**
 * Hook for collaborative playlist management
 */
export const useCollaborativePlaylist = (playlistId?: string) => {
  const store = useCollaborationStore();

  const playlist = playlistId ? store.activeCollaborations[playlistId] : undefined;
  const presence = playlistId ? store.userPresence[playlistId] || {} : {};

  return {
    playlist,
    presence,
    isLoading: store.isLoading,
    connectionStatus: store.connectionStatus,
    lastError: store.lastError,

    // Actions
    applyOperation: (operation: Omit<PlaylistOperation, 'id' | 'timestamp'>) =>
      playlistId ? store.applyOperation(playlistId, operation) : Promise.resolve(false),
    updatePresence: (presence: Partial<UserCursor>) =>
      playlistId ? store.updateUserPresence(playlistId, presence) : undefined,
    leaveCollaboration: () =>
      playlistId ? store.leaveCollaboration(playlistId) : Promise.resolve(false),

    // Utility
    clearError: store.clearError
  };
};

/**
 * Hook for collaboration invitations
 */
export const useCollaborationInvitations = () => {
  const store = useCollaborationStore();

  return {
    sentInvitations: store.sentInvitations,
    receivedInvitations: store.receivedInvitations,
    unreadCount: store.unreadNotificationCount,
    isSending: store.isSendingInvitation,

    // Actions
    sendInvitation: store.sendInvitation,
    respondToInvitation: store.respondToInvitation,
    refreshInvitations: store.refreshInvitations
  };
};

/**
 * Hook for collaboration notifications
 */
export const useCollaborationNotifications = () => {
  const store = useCollaborationStore();

  return {
    notifications: store.notifications,
    unreadCount: store.unreadNotificationCount,

    // Actions
    markAsRead: store.markNotificationAsRead,
    markAllAsRead: store.markAllNotificationsAsRead,
    clearAll: store.clearNotifications
  };
};
