const demoUsersByEmail = new Map();
const demoUsersById = new Map();

export const normalizeDemoEmail = (email = '') => email.toLowerCase().trim();

export const createDemoUser = (user) => {
  const email = normalizeDemoEmail(user.email);
  const normalizedUser = {
    ...user,
    _id: String(user._id || `demo-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`),
    email,
    skills: user.skills || [],
    education: user.education || [],
    experience: user.experience || [],
    preferredRoles: user.preferredRoles || [],
    preferredLocations: user.preferredLocations || [],
    preferredJobTypes: user.preferredJobTypes || [],
    preferredWorkModes: user.preferredWorkModes || [],
    resume: user.resume || '',
    socialLinks: user.socialLinks || {},
    createdAt: user.createdAt || new Date(),
    updatedAt: user.updatedAt || new Date(),
  };

  demoUsersByEmail.set(email, normalizedUser);
  demoUsersById.set(normalizedUser._id, normalizedUser);

  return normalizedUser;
};

export const findDemoUserByEmail = (email) => {
  if (!email) return null;
  return demoUsersByEmail.get(normalizeDemoEmail(email)) || null;
};

export const findDemoUserById = (id) => {
  if (!id) return null;
  return demoUsersById.get(String(id)) || null;
};

export const updateDemoUserById = (id, updates = {}) => {
  const currentUser = findDemoUserById(id);

  if (!currentUser) return null;

  const nextUser = {
    ...currentUser,
    ...updates,
    _id: String(currentUser._id),
    email: normalizeDemoEmail(updates.email || currentUser.email),
    updatedAt: new Date(),
  };

  demoUsersByEmail.set(nextUser.email, nextUser);
  demoUsersById.set(nextUser._id, nextUser);

  return nextUser;
};
