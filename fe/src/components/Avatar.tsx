/**
 * Generates a random avatar URL for users without profile pictures
 * Uses DiceBear API for colorful, diverse avatars
 * @param userId - User ID to ensure some consistency per user
 * @param userName - User name for initials-based avatars
 * @returns Random avatar URL
 */
export const getRandomAvatar = (userId: number | string, userName?: string): string => {
    // List of different avatar styles from DiceBear
    const avatarStyles = [
        'thumbs'
    ];

    // Generate a consistent hex color based on userId
    const colors = ['FF6B6B', '4ECDC4', '45B7D1', '96CEB4', 'FECA57', 'FF9FF3', 'F38BA8', '6C5CE7', 'A29BFE', 'FD79A8'];
    const colorIndex = Number(userId) % colors.length;
    const backgroundColor = colors[colorIndex];

    // Use userId to pick a consistent style for the user session
    const styleIndex = Number(userId) % avatarStyles.length;
    const selectedStyle = avatarStyles[styleIndex];

    // For initials style, use the user's name if available
    if (selectedStyle === 'initials' && userName) {
        const initials = userName
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .substring(0, 2)
            .toUpperCase();
        return `https://api.dicebear.com/7.x/initials/svg?seed=${initials}&backgroundColor=${backgroundColor}`;
    }

    // For other styles, use userId as seed for some consistency
    return `https://api.dicebear.com/7.x/${selectedStyle}/svg?seed=${userId}&backgroundColor=${backgroundColor}`;
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
    userId: number | string,
    userName?: string
): string => {
    if (profilePic) {
        return profilePic;
    }

    return getRandomAvatar(userId, userName);
}; 