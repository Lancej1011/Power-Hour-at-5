/**
 * Email Service for Collaborative Playlist Invitations
 * Handles sending invitation emails using Firebase Functions or fallback methods
 */

import { httpsCallable, getFunctions } from 'firebase/functions';
import { app } from '../config/firebase';

interface InvitationEmailData {
  inviteeEmail: string;
  inviterName: string;
  playlistName: string;
  inviteCode: string;
  playlistId: string;
  message?: string;
  permission: 'editor' | 'viewer';
}

interface EmailResponse {
  success: boolean;
  message: string;
  emailSent?: boolean;
}

class EmailService {
  private static instance: EmailService;
  private functions: any;

  private constructor() {
    try {
      this.functions = getFunctions(app);
    } catch (error) {
      console.warn('Firebase Functions not available:', error);
      this.functions = null;
    }
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Send invitation email using Firebase Functions or mailto fallback
   */
  async sendInvitationEmail(data: InvitationEmailData): Promise<EmailResponse> {
    try {
      // Try Firebase Functions first
      if (this.functions) {
        const sendInvitationEmail = httpsCallable(this.functions, 'sendCollaborationInvitation');

        try {
          const result = await sendInvitationEmail(data);
          const response = result.data as EmailResponse;

          if (response.success) {
            console.log('✅ Invitation email sent via Firebase Functions');
            return response;
          } else {
            console.warn('⚠️ Firebase Functions failed:', response.message);
          }
        } catch (functionsError) {
          console.warn('⚠️ Firebase Functions not available or failed:', functionsError);
        }
      } else {
        console.log('ℹ️ Firebase Functions not configured, using mailto fallback');
      }

      // Fallback to mailto link
      console.log('📧 Using mailto fallback for email invitation');
      return await this.sendEmailFallback(data);

    } catch (error) {
      console.error('❌ Error sending invitation email:', error);
      return {
        success: false,
        message: 'Failed to send invitation email',
        emailSent: false
      };
    }
  }

  /**
   * Fallback email service using browser mailto
   */
  private async sendEmailFallback(data: InvitationEmailData): Promise<EmailResponse> {
    try {
      // Use mailto link for user to send manually
      return this.generateMailtoLink(data);

    } catch (error) {
      console.error('❌ Fallback email service failed:', error);
      return {
        success: false,
        message: 'Email service failed',
        emailSent: false
      };
    }
  }

  /**
   * Generate mailto link as final fallback
   */
  private generateMailtoLink(data: InvitationEmailData): EmailResponse {
    const subject = `Invitation to collaborate on "${data.playlistName}"`;
    const body = `Hi!

${data.inviterName} has invited you to collaborate on the playlist "${data.playlistName}" in Power Hour at 5.

You can join this collaborative playlist using the invite code: ${data.inviteCode}

To join:
1. Open Power Hour at 5: ${window.location.origin}
2. Sign in to your account
3. Click "Join Collaborative Playlist" 
4. Enter the invite code: ${data.inviteCode}

${data.message ? `\nPersonal message from ${data.inviterName}:\n${data.message}` : ''}

Happy collaborating!
- Power Hour at 5 Team`;

    const mailtoUrl = `mailto:${data.inviteeEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Open mailto link
    window.open(mailtoUrl, '_blank');
    
    console.log('📧 Generated mailto link for manual sending');
    return {
      success: true,
      message: 'Email client opened. Please send the invitation manually.',
      emailSent: false
    };
  }

  /**
   * Validate email address
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Generate invitation email preview
   */
  generateEmailPreview(data: InvitationEmailData): string {
    return `Subject: Invitation to collaborate on "${data.playlistName}"

Hi!

${data.inviterName} has invited you to collaborate on the playlist "${data.playlistName}" in Power Hour at 5.

Invite Code: ${data.inviteCode}
Permission Level: ${data.permission}

${data.message ? `Personal message: ${data.message}` : ''}

To join, visit: ${window.location.origin}/join-collaboration?code=${data.inviteCode}`;
  }
}

export const emailService = EmailService.getInstance();
export type { InvitationEmailData, EmailResponse };
