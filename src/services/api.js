const BASE_URL = "https://xora-chat-backend-production.up.railway.app";

export async function registerUser(phone, username, photo) {
  const res = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, username, photo }),
  });
  return res.json();
}

export async function loginUser(phone) {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  return res.json();
}

export async function getConversations(userId) {
  const res = await fetch(`${BASE_URL}/conversations/${userId}`);
  return res.json();
}

export async function getMessagesBetween(user1, user2) {
  const res = await fetch(`${BASE_URL}/messages/${user1}/${user2}`);
  return res.json();
}

export async function lookupByPhone(phone) {
  const res = await fetch(`${BASE_URL}/lookup/${phone}`);
  return res.json();
}

export async function sendOtp(phone) {
  const res = await fetch(`${BASE_URL}/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  return res.json();
}

export async function verifyOtp(phone, otp) {
  const res = await fetch(`${BASE_URL}/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, otp }),
  });
  return res.json();
}


export async function getUserById(userId) {
  const res = await fetch(`${BASE_URL}/user/${userId}`);
  return res.json();
}


export async function deleteAccount(userId) {
  const res = await fetch(`${BASE_URL}/delete-user/${userId}`, {
    method: "DELETE",
  });
  return res.json();
}

export async function hideConversation(userId, otherUserId) {
  const res = await fetch(`${BASE_URL}/hide-conversation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, other_user_id: otherUserId }),
  });
  return res.json();
}


export async function createGroup(name, createdBy, memberIds) {
  const res = await fetch(`${BASE_URL}/create-group`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, created_by: createdBy, member_ids: memberIds }),
  });
  return res.json();
}

export async function getUserGroups(userId) {
  const res = await fetch(`${BASE_URL}/user-groups/${userId}`);
  return res.json();
}

export async function getGroupMessages(groupId) {
  const res = await fetch(`${BASE_URL}/group-messages/${groupId}`);
  return res.json();
}

export async function getGroupMembers(groupId) {
  const res = await fetch(`${BASE_URL}/group-members/${groupId}`);
  return res.json();
}


export async function getCallHistory(userId) {
  const res = await fetch(`${BASE_URL}/call-history/${userId}`);
  return res.json();
}


export async function getUserProfile(userId) {
  const res = await fetch(`${BASE_URL}/profile/${userId}`);
  return res.json();
}

export async function updateUserProfile(userId, username, status, profilePhoto) {
  const res = await fetch(`${BASE_URL}/profile/${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, username, status, profile_photo: profilePhoto }),
  });
  return res.json();
}


export async function addGroupMember(groupId, userId) {
  const res = await fetch(`${BASE_URL}/group-manage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ group_id: groupId, user_id: userId }),
  });
  return res.json();
}

export async function removeGroupMember(groupId, userId) {
  const res = await fetch(`${BASE_URL}/group-manage`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ group_id: groupId, user_id: userId }),
  });
  return res.json();
}