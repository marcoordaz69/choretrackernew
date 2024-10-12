export const deleteAvatar = async (userId, avatarId) => {
  const response = await fetch(`/api/family/delete-avatar/${userId}/${avatarId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.json();
};

export const addAvatar = async (userId, avatarFile) => {
  const formData = new FormData();
  formData.append('image', avatarFile);
  formData.append('userId', userId);

  const response = await fetch('/api/family/add-avatar', {
    method: 'POST',
    body: formData,
  });
  return response.json();
};