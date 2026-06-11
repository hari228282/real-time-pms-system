import { Project } from '../models/project.model.js';
import { Task } from '../models/task.model.js';
import { User } from '../models/user.model.js';
import AppError from '../utils/AppError.js';

/**
 * Project business logic + authorization. All ownership/role checks live here so they're
 * enforced identically no matter who calls (REST controller today, socket handler later).
 */

/** Load a project the user is allowed to SEE (owner or member), else throw 403/404. */
async function getMemberProjectOrThrow(projectId, userId) {
  const project = await Project.findById(projectId);
  if (!project) throw AppError.notFound('Project not found');
  if (!isMember(project, userId)) {
    throw AppError.forbidden('You are not a member of this project');
  }
  return project;
}

/** Owner or admin-role member — required for project-admin actions. */
function assertCanAdmin(project, userId) {
  const owner = String(project.owner) === String(userId);
  const admin = project.members.some(
    (m) => String(m.user) === String(userId) && m.role === 'admin'
  );
  if (!owner && !admin) throw AppError.forbidden('Requires project admin');
}

function isMember(project, userId) {
  if (String(project.owner) === String(userId)) return true;
  return project.members.some((m) => String(m.user) === String(userId));
}

async function create({ name, description }, userId) {
  // Owner is also stored as an admin member so membership queries find them too.
  const project = await Project.create({
    name,
    description,
    owner: userId,
    members: [{ user: userId, role: 'admin' }],
  });
  return project;
}

/** Projects the user owns or is a member of. */
async function listForUser(userId) {
  return Project.find({
    $or: [{ owner: userId }, { 'members.user': userId }],
  }).sort({ updatedAt: -1 });
}

async function getById(projectId, userId) {
  const project = await getMemberProjectOrThrow(projectId, userId);
  return project.populate('members.user', 'name email');
}

async function update(projectId, userId, patch) {
  const project = await getMemberProjectOrThrow(projectId, userId);
  assertCanAdmin(project, userId);

  if (patch.name !== undefined) project.name = patch.name;
  if (patch.description !== undefined) project.description = patch.description;
  await project.save();
  return project;
}

async function remove(projectId, userId) {
  const project = await getMemberProjectOrThrow(projectId, userId);
  // Only the true owner can delete the project (and cascade its tasks).
  if (String(project.owner) !== String(userId)) {
    throw AppError.forbidden('Only the owner can delete this project');
  }
  await Task.deleteMany({ project: projectId });
  await project.deleteOne();
  return { id: projectId };
}

async function addMember(projectId, actingUserId, { email, role }) {
  const project = await getMemberProjectOrThrow(projectId, actingUserId);
  assertCanAdmin(project, actingUserId);

  const user = await User.findOne({ email });
  if (!user) throw AppError.notFound('No user with that email');

  if (isMember(project, user.id)) {
    throw AppError.conflict('User is already a member', 'ALREADY_MEMBER');
  }
  project.members.push({ user: user.id, role: role || 'member' });
  await project.save();
  return project.populate('members.user', 'name email');
}

async function removeMember(projectId, actingUserId, targetUserId) {
  const project = await getMemberProjectOrThrow(projectId, actingUserId);
  assertCanAdmin(project, actingUserId);

  if (String(project.owner) === String(targetUserId)) {
    throw AppError.badRequest('Cannot remove the project owner');
  }
  project.members = project.members.filter(
    (m) => String(m.user) !== String(targetUserId)
  );
  await project.save();
  return project;
}

export const projectService = {
  create,
  listForUser,
  getById,
  update,
  remove,
  addMember,
  removeMember,
  // Shared authorization helpers reused by the task service + socket layer:
  getMemberProjectOrThrow,
  isMember,
};
