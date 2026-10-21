import api from './api';

// Type definitions matching your backend response format
interface ApiResponse<T = any> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

interface ApiError {
  statusCode: number;
  message: string;
  errors: string[];
  success: false;
}

// Auth Services
export const authService = {
  login: async (credentials: { email: string; password: string }): Promise<ApiResponse> => {
    const response = await api.post('/login', credentials);

    // Store tokens with timestamp for session tracking
    if (response.data?.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
    }
    if (response.data?.refreshToken) {
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }

    // Store userType
    if (response.data?.userType) {
      localStorage.setItem('userType', response.data.userType);
    }

    return response || response.data;
  },

  logout: async (): Promise<ApiResponse> => {
    return await api.post('/logout');
  },

  forgotPassword: async (email: string): Promise<ApiResponse> => {
    return await api.post('/forgot-password', { email });
  },

  verifyOTP: async (email: string, otp: string): Promise<ApiResponse> => {
    return await api.post('/verify-otp', { email, otp });
  },

  refreshAccessToken: async (refreshToken: string): Promise<ApiResponse> => {
    return await api.post('/refresh-token', { token: refreshToken });
  },

  resetPassword: async (email: string, newPassword: string, otp: string): Promise<ApiResponse> => {
    return await api.post('/reset-password', {
      email,
      newPassword,
      otp
    });
  }
};

// User Services
export const userService = {
  getCurrentUser: async (): Promise<ApiResponse> => {
    const response = await api.get('/users/user');
    return response || response.data;
  },

  updateProfile: async (data: any): Promise<ApiResponse> => {
    return await api.patch('/users/update-user', data);
  },

  getAllUsers: async (): Promise<ApiResponse> => {
    try {
      const response = await api.get('/users/alluser');
      return response || response.data;
    } catch (error: any) {
      throw error;
    }
  },

  getUserById: async (userId: string): Promise<ApiResponse> => {
    return await api.get(`/users/${userId}`);
  },

  updateAvatar: async (formData: FormData): Promise<ApiResponse> => {
    return await api.post('/users/update-avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  changePassword: async (data: {
    oldPassword: string;
    newPassword: string;
  }): Promise<ApiResponse> => {
    return await api.post('/users/change-password', data);
  }
};

// Admin Services
export const adminService = {
  getCurrentAdmin: async (): Promise<ApiResponse> => {
    const response = await api.get('/admin/current-admin');
    return response || response.data;
  },

  uploadCSV: async (formData: FormData): Promise<ApiResponse> => {
    return await api.post('/admin/addcsv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  getAllUsers: async (): Promise<ApiResponse> => {
    try {
      const response = await api.get('/admin/alluser');
      return response || response.data;
    } catch (error: any) {
      throw error;
    }
  },

  updateAdminProfile: async (data: { name: string; email: string }): Promise<ApiResponse> => {
    return await api.patch('/admin/update-profile', data);
  },

  updateAdminAvatar: async (formData: FormData): Promise<ApiResponse> => {
    return await api.patch('/admin/update-avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  editUserDetails: async (userId: string, data: any): Promise<ApiResponse> => {
    return await api.patch(`/admin/editdetails/${userId}`, data);
  },

  deleteUser: async (userId: string): Promise<ApiResponse> => {
    return await api.delete(`/admin/deleteuser/${userId}`);
  },

  changeAdminPassword: async (data: {
    oldPassword: string;
    newPassword: string;
  }): Promise<ApiResponse> => {
    return await api.post('/admin/change-password', data);
  },

  forgotPassword: async (email: string): Promise<ApiResponse> => {
    return await api.post('/forgot-password', { email });
  },

  verifyOTP: async (email: string, otp: string): Promise<ApiResponse> => {
    return await api.post('/admin/verify-otp', { email, otp });
  },

  resetPassword: async (email: string, newPassword: string, otp: string): Promise<ApiResponse> => {
    return await api.post('/admin/reset-password', {
      email,
      newPassword,
      otp
    });
  },

  getAllDonations: async (): Promise<ApiResponse> => {
    return await api.get('/donations/getDonations');
  },

  // Reports Management
  getReports: async (params?: { status?: string; page?: number; limit?: number }): Promise<ApiResponse> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return await api.get(`/admin/reports?${queryParams.toString()}`);
  },

  getReportedUsers: async (): Promise<ApiResponse> => {
    return await api.get('/admin/reported-users');
  },

  banUser: async (userId: string, data: { type: 'temp_banned' | 'suspended'; duration?: number; reason?: string }): Promise<ApiResponse> => {
    return await api.post(`/admin/users/${userId}/ban`, data);
  },

  unbanUser: async (userId: string): Promise<ApiResponse> => {
    return await api.post(`/admin/users/${userId}/unban`);
  },

  dismissReport: async (reportId: string): Promise<ApiResponse> => {
    return await api.patch(`/admin/reports/${reportId}/dismiss`);
  }
};

// Events Services
export const eventService = {
  getEvents: async (): Promise<ApiResponse> => {
    return await api.get('/events/getEvents');
  },

  createEvent: async (eventData: any): Promise<ApiResponse> => {
    return await api.post('/events/addEvent', eventData);
  },

  updateEvent: async (id: string, eventData: any): Promise<ApiResponse> => {
    return await api.patch(`/events/editEvent/${id}`, eventData);
  },

  deleteEvent: async (id: string): Promise<ApiResponse> => {
    return await api.delete(`/events/deleteEvent/${id}`);
  },

  joinEvent: async (eventId: string): Promise<ApiResponse> => {
    return await api.post(`/events/addUserToEvent/${eventId}`);
  },

  leaveEvent: async (eventId: string): Promise<ApiResponse> => {
    return await api.post(`/events/removeUserFromEvent/${eventId}`);
  },

  getEventParticipants: async (eventId: string): Promise<ApiResponse> => {
    return await api.get(`/events/getEventParticipants/${eventId}`);
  },
};

// Donation Services
export const donationService = {
  getCampaigns: async (): Promise<ApiResponse> => {
    return await api.get('/donations/getDonations');
  },

  createCampaign: async (campaignData: {
    name: string;
    description: string;
    goal: number;
    endDate?: string;
    category?: string;
  }): Promise<ApiResponse> => {
    return await api.post('/donations/addDonation', campaignData);
  },

  updateCampaign: async (id: string, campaignData: {
    name: string;
    description: string;
    goal: number;
    endDate?: string;
    category?: string;
  }): Promise<ApiResponse> => {
    return await api.patch(`/donations/editDonation/${id}`, campaignData);
  },

  deleteCampaign: async (id: string): Promise<ApiResponse> => {
    return await api.delete(`/donations/deleteDonation/${id}`);
  },

  contributeToCampaign: async (campaignId: string, amount: number): Promise<ApiResponse> => {
    return await api.post(`/donations/donationAmount/${campaignId}`, { amount });
  },

  getCampaignDonors: async (campaignId: string) => {
    try {
      const response = await api.get(`/donations/getDonors/${campaignId}`);
      return response.data || response;
    } catch (error) {
      throw error;
    }
  },

  getRecentDonors: async (): Promise<ApiResponse> => {
    try {
      const response = await api.get('/donations/recent-donors');
      return response || response.data;
    } catch (error) {
      throw error;
    }
  },

  getDonationStats: async (): Promise<ApiResponse> => {
    try {
      const response = await api.get('/donations/getDonationStats');
      return response || response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Job Services
export const jobService = {
  getAllJobs: async (): Promise<ApiResponse> => {
    return await api.get('/jobs/getAllJobs');
  },

  getMyPostedJobs: async (): Promise<ApiResponse> => {
    return await api.get('/jobs/getMyPostedJobs');
  },

  addJob: async (jobData: {
    title: string;
    description: string;
    location: string;
    company: string;
    jobType: string;
    category: string;
    experienceRequired: string;
    salary: number;
  }): Promise<ApiResponse> => {
    return await api.post('/jobs/addJob', jobData);
  },

  updateJob: async (id: string, jobData: {
    title: string;
    description: string;
    location: string;
    company: string;
    jobType: string;
    category: string;
    experienceRequired: string;
    salary: number;
  }): Promise<ApiResponse> => {
    return await api.patch(`/jobs/editJob/${id}`, jobData);
  },

  deleteJob: async (id: string): Promise<ApiResponse> => {
    return await api.delete(`/jobs/deleteJob/${id}`);
  },

  verifyJob: async (id: string): Promise<ApiResponse> => {
    return await api.patch(`/jobs/verifyJob/${id}`);
  },

  applyForJob: async (id: string): Promise<ApiResponse> => {
    return await api.post(`/jobs/jobApply/${id}`);
  },

  unapplyForJob: async (id: string): Promise<ApiResponse> => {
    return await api.delete(`/jobs/jobUnapply/${id}`);
  },

  getJobApplicants: async (id: string): Promise<ApiResponse> => {
    return await api.get(`/jobs/jobApplicants/${id}`);
  },

  rejectJob: async (jobId: string) => {
    return await api.delete(`/jobs/rejectJob/${jobId}`);
  },
};

// Email Services
export const emailService = {
  sendBulkEmails: async (emailData: {
    subject: string;
    body: string;
    filter: string;
    type?: string;
  }): Promise<ApiResponse> => {
    return await api.post('/emails/sendEmail', emailData);
  },

  getEmailHistory: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return await api.get(`/emails/history?${queryParams.toString()}`);
  }
};

// Communication Services (Posts & Comments)
export const communicationService = {
  // Post APIs
  getAllPosts: async (params?: {
    page?: number;
    limit?: number;
    category?: string;
    sortBy?: 'hot' | 'new' | 'top' | 'createdAt';
    order?: 'asc' | 'desc';
    search?: string;
  }): Promise<ApiResponse> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return await api.get(`/communications/posts?${queryParams.toString()}`);
  },

  getPostById: async (postId: string): Promise<ApiResponse> => {
    return await api.get(`/communications/posts/${postId}`);
  },

  createPost: async (formData: FormData): Promise<ApiResponse> => {
    return await api.post('/communications/posts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  updatePost: async (postId: string, data: {
    content?: string;
    category?: string;
  }): Promise<ApiResponse> => {
    return await api.patch(`/communications/posts/${postId}`, data);
  },

  deletePost: async (postId: string): Promise<ApiResponse> => {
    return await api.delete(`/communications/posts/${postId}`);
  },

  upvotePost: async (postId: string): Promise<ApiResponse> => {
    return await api.post(`/communications/posts/${postId}/upvote`);
  },

  downvotePost: async (postId: string): Promise<ApiResponse> => {
    return await api.post(`/communications/posts/${postId}/downvote`);
  },

  toggleSavePost: async (postId: string): Promise<ApiResponse> => {
    return await api.post(`/communications/posts/${postId}/save`);
  },

  getSavedPosts: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return await api.get(`/communications/posts/saved?${queryParams.toString()}`);
  },

  getUserPosts: async (userId: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return await api.get(`/communications/posts/user/${userId}?${queryParams.toString()}`);
  },

  getCommunicationStats: async (): Promise<ApiResponse> => {
    return await api.get('/communications/posts/stats');
  },

  togglePinPost: async (postId: string): Promise<ApiResponse> => {
    return await api.post(`/communications/posts/${postId}/pin`);
  },

  reportPost: async (postId: string, data?: { reason?: string; description?: string }): Promise<ApiResponse> => {
    return await api.post(`/communications/posts/${postId}/report`, data || {});
  },

  // Comment APIs
  createComment: async (data: {
    content: string;
    postId: string;
    parentCommentId?: string;
  }): Promise<ApiResponse> => {
    return await api.post('/communications/comments', data);
  },

  getPostComments: async (postId: string, params?: {
    page?: number;
    limit?: number;
    sortBy?: 'top' | 'new' | 'createdAt';
    order?: 'asc' | 'desc';
  }): Promise<ApiResponse> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return await api.get(`/communications/posts/${postId}/comments?${queryParams.toString()}`);
  },

  getCommentReplies: async (commentId: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return await api.get(`/communications/comments/${commentId}/replies?${queryParams.toString()}`);
  },

  updateComment: async (commentId: string, data: {
    content: string;
  }): Promise<ApiResponse> => {
    return await api.patch(`/communications/comments/${commentId}`, data);
  },

  deleteComment: async (commentId: string): Promise<ApiResponse> => {
    return await api.delete(`/communications/comments/${commentId}`);
  },

  upvoteComment: async (commentId: string): Promise<ApiResponse> => {
    return await api.post(`/communications/comments/${commentId}/upvote`);
  },

  downvoteComment: async (commentId: string): Promise<ApiResponse> => {
    return await api.post(`/communications/comments/${commentId}/downvote`);
  },
};

// Notification Services
export const notificationService = {
  getNotifications: async (params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    type?: string;
  }): Promise<ApiResponse> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return await api.get(`/notifications?${queryParams.toString()}`);
  },

  getUnreadCount: async (): Promise<ApiResponse> => {
    return await api.get('/notifications/unread/count');
  },

  markAsRead: async (notificationId: string): Promise<ApiResponse> => {
    return await api.patch(`/notifications/${notificationId}/read`);
  },

  markAllAsRead: async (): Promise<ApiResponse> => {
    return await api.patch('/notifications/read-all');
  },

  deleteNotification: async (notificationId: string): Promise<ApiResponse> => {
    return await api.delete(`/notifications/${notificationId}`);
  },
};

// Connection Services
export const connectionService = {
  sendConnectionRequest: async (recipientId: string): Promise<ApiResponse> => {
    return await api.post('/connections/request', { recipientId });
  },

  getConnectionStatus: async (userId: string): Promise<ApiResponse> => {
    return await api.get(`/connections/status/${userId}`);
  },

  getConnections: async (params?: {
    status?: string;
  }): Promise<ApiResponse> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return await api.get(`/connections?${queryParams.toString()}`);
  },

  getPendingRequests: async (): Promise<ApiResponse> => {
    return await api.get('/connections/requests');
  },

  acceptConnectionRequest: async (connectionId: string): Promise<ApiResponse> => {
    return await api.post(`/connections/accept/${connectionId}`);
  },

  rejectConnectionRequest: async (connectionId: string): Promise<ApiResponse> => {
    return await api.post(`/connections/reject/${connectionId}`);
  },

  removeConnection: async (connectionId: string): Promise<ApiResponse> => {
    return await api.delete(`/connections/${connectionId}`);
  },
};

// Message Services
export const messageService = {
  getOrCreateConversation: async (participantId: string): Promise<ApiResponse> => {
    return await api.post('/messages/conversation', { participantId });
  },

  getUserConversations: async (): Promise<ApiResponse> => {
    return await api.get('/messages/conversations');
  },

  sendMessage: async (conversationId: string, content: string): Promise<ApiResponse> => {
    return await api.post('/messages/send', { conversationId, content });
  },

  getConversationMessages: async (
    conversationId: string,
    params?: { page?: number; limit?: number }
  ): Promise<ApiResponse> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return await api.get(`/messages/conversation/${conversationId}?${queryParams.toString()}`);
  },

  markMessagesAsRead: async (conversationId: string): Promise<ApiResponse> => {
    return await api.patch(`/messages/conversation/${conversationId}/read`);
  },

  getUnreadCount: async (): Promise<ApiResponse> => {
    return await api.get('/messages/unread-count');
  },

  deleteMessage: async (messageId: string): Promise<ApiResponse> => {
    return await api.delete(`/messages/${messageId}`);
  },
};

// Error handler utility
export const handleApiError = (error: ApiError) => {
  return {
    message: error.message || 'An unexpected error occurred',
    errors: error.errors || [],
    statusCode: error.statusCode || 500
  };
};

// Success handler utility
export const handleApiSuccess = (response: ApiResponse) => {
  return {
    data: response.data,
    message: response.message,
    statusCode: response.statusCode
  };
};