export function transformUser(user) {
  const aUser = { ...user }
  aUser.fcmTokenSet = !!aUser.notification_token
  delete aUser.notification_token
  return aUser
}
