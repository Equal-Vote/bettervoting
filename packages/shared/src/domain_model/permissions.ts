import { roles} from "./roles"

export type permission = roles[]

export const permissions = {
  canEditElectionRoles:      [roles.system_admin, roles.owner],
  canViewElection:           [roles.system_admin, roles.owner, roles.admin, roles.auditor, roles.credentialer],
  canEditElection:           [roles.system_admin, roles.owner, roles.admin],
  canDeleteElection:         [roles.system_admin, roles.owner],
  canEditElectionRoll:       [roles.system_admin, roles.owner],
  canAddToElectionRoll:      [roles.system_admin, roles.owner, roles.admin],
  canViewElectionRoll:       [roles.system_admin, roles.owner, roles.admin, roles.auditor, roles.credentialer],
  canFlagElectionRoll:       [roles.system_admin, roles.owner, roles.admin, roles.auditor, roles.credentialer],
  canApproveElectionRoll:    [roles.system_admin, roles.owner, roles.admin, roles.credentialer],
  canUnflagElectionRoll:     [roles.system_admin, roles.owner, roles.admin],
  canInvalidateElectionRoll: [roles.system_admin, roles.owner, roles.admin],
  canDeleteElectionRoll:     [roles.system_admin, roles.owner],
  canViewElectionRollIDs:    [roles.system_admin, roles.auditor],
  canViewBallots:            [roles.system_admin, roles.owner, roles.admin, roles.auditor],
  canDeleteAllBallots:       [roles.system_admin, roles.owner, roles.admin],
  canViewBallot:             [roles.system_admin],
  canEditBallot:             [roles.system_admin, roles.owner],
  canFlagBallot:             [roles.system_admin, roles.owner, roles.admin, roles.auditor],
  canInvalidateBallot:       [roles.system_admin, roles.owner],
  canEditElectionState:      [roles.system_admin, roles.owner],
  canViewPreliminaryResults: [roles.system_admin, roles.owner, roles.admin, roles.auditor],
  canSendEmails:             [roles.system_admin, roles.owner, roles.admin],
  canUpdatePublicArchive:    [roles.system_admin],
  canUploadBallots:          [roles.system_admin, roles.owner],
  canQueryElections:         [roles.system_admin],
}

export const hasPermission = (roles:roles[],permission:permission) => {
  return roles.some( (role) => permission.includes(role))
}

export const getPermissions = (roles:roles[]) => {
  //Will likely rework permissions and roles in the future so that each role has list of permissions instead
  //This is a temp workaround to get all permissions to send to frontend so it can control what users can see/do
  const userPermissions:any = []
  let p: keyof typeof permissions
  for(p in permissions ){
    if (roles.some( (role) => permissions[p].includes(role))){
      userPermissions.push(p)
    }
  }
  return userPermissions
}