import { useSocket } from './useSocket';

/**
 * Hook to check if a specific user is online
 * @param userId - The user ID to check
 * @returns boolean - true if user is online
 */
export function useOnlineStatus(userId: string | undefined): boolean {
  const { onlineUsers } = useSocket();
  
  if (!userId) return false;
  
  return onlineUsers.has(userId);
}
