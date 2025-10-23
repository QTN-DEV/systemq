import { getDocumentById, getDocumentPermissions, getFolderPathIds } from '../lib/shared/services/DocumentService'
import type { DocumentPermission } from '../types/document-permissions'
import type { PermissionLevel } from '../types/document-permissions'

/**
 * Checks if a user has higher permissions in any ancestor folder
 * @param userId - The user ID to check
 * @param currentFolderId - The current folder ID
 * @param targetPermission - The permission level being assigned
 * @returns Object with validation result and details
 */
export async function validatePermissionInheritance(
  userId: string,
  currentFolderId: string,
  targetPermission: PermissionLevel
): Promise<{
  isValid: boolean
  conflictDetails?: {
    folderId: string
    folderName: string
    existingPermission: PermissionLevel
    message: string
  }
}> {
  try {
    // Get the path of ancestor folders
    const pathIds = await getFolderPathIds(currentFolderId)
    
    // Check each ancestor folder for user permissions
    for (const folderId of pathIds) {
      if (folderId === currentFolderId) continue // Skip current folder
      
      const permissions = await getDocumentPermissions(folderId)
      if (!permissions) continue
      
      // Check if user has permissions in this ancestor folder
      const userPermission = permissions.user_permissions.find(
        (perm: DocumentPermission) => perm.user_id === userId
      )
      
      if (userPermission) {
        // Check if the existing permission is higher than the target permission
        const isDowngrade = isPermissionDowngrade(userPermission.permission, targetPermission)
        
        if (isDowngrade) {
          // Get folder details for the error message
          const folder = await getDocumentById(folderId, null)
          const folderName = folder?.name || 'Unknown Folder'
          
          return {
            isValid: false,
            conflictDetails: {
              folderId,
              folderName,
              existingPermission: userPermission.permission,
              message: `${userPermission.user_name} has ${userPermission.permission} access in their ancestor folder "${folderName}". Cannot assign ${targetPermission} access.`
            }
          }
        }
      }
    }
    
    return { isValid: true }
  } catch (error) {
    console.error('Error validating permission inheritance:', error)
    // If there's an error, allow the operation to proceed
    // This prevents blocking legitimate operations due to technical issues
    return { isValid: true }
  }
}

/**
 * Determines if changing from one permission to another is a downgrade
 * @param currentPermission - Current permission level
 * @param newPermission - New permission level being assigned
 * @returns true if it's a downgrade, false otherwise
 */
export function isPermissionDowngrade(currentPermission: PermissionLevel, newPermission: PermissionLevel): boolean {
  const permissionLevels = {
    viewer: 1,
    editor: 2
  }
  
  return permissionLevels[newPermission] < permissionLevels[currentPermission]
}

/**
 * Gets the highest permission level a user has in ancestor folders
 * @param userId - The user ID to check
 * @param currentFolderId - The current folder ID
 * @returns The highest permission level found, or null if none found
 */
export async function getHighestAncestorPermission(
  userId: string,
  currentFolderId: string
): Promise<PermissionLevel | null> {
  try {
    const pathIds = await getFolderPathIds(currentFolderId)
    let highestPermission: PermissionLevel | null = null
    
    for (const folderId of pathIds) {
      if (folderId === currentFolderId) continue
      
      const permissions = await getDocumentPermissions(folderId)
      if (!permissions) continue
      
      const userPermission = permissions.user_permissions.find(
        (perm: DocumentPermission) => perm.user_id === userId
      )
      
      if (userPermission) {
        if (!highestPermission || isPermissionDowngrade(highestPermission, userPermission.permission)) {
          highestPermission = userPermission.permission
        }
      }
    }
    
    return highestPermission
  } catch (error) {
    console.error('Error getting highest ancestor permission:', error)
    return null
  }
}
