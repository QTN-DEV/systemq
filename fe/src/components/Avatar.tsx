/**
 * Generates a random avatar URL for users without profile pictures
 * Uses DiceBear API for colorful, diverse avatars
 * @param userId - User ID to ensure some consistency per user
 * @param userName - User name for initials-based avatars
 * @returns Random avatar URL
 */
export const getRandomAvatar = (userName: string): string => {
    const initials = userName
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .substring(0, 2)
        .toUpperCase();
    return `https://api.dicebear.com/7.x/initials/svg?seed=${initials}`;
};

/**
 * Gets the appropriate avatar URL - profile pic if available, otherwise random avatar
 * @param profilePic - User's profile picture URL
 * @param userId - User ID for random avatar generation
 * @param userName - User name for initials-based avatars
 * @returns Avatar URL to display
 */
export const getAvatarUrl = (
    profilePic: string | null | undefined,
    userName: string
): string => {
    if (profilePic) {
        return profilePic;
    }

    return getRandomAvatar(userName);
}; 