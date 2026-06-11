import { User } from '../models/user.model.js';
import AppError from '../utils/AppError.js';
import { signToken } from '../utils/jwt.js';

/**
 * Business logic for authentication. This is the only layer that touches the User model.
 * Controllers call these and shape the HTTP response; they never see Mongoose.
 */

async function register({ name, email, password }) {
  const existing = await User.findOne({ email });
  if (existing) throw AppError.conflict('Email already registered', 'EMAIL_TAKEN');

  const user = new User({ name, email });
  await user.setPassword(password);
  await user.save();

  return issueAuth(user);
}

async function login({ email, password }) {
  // passwordHash is select:false, so explicitly include it for the comparison.
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) throw AppError.unauthorized('Invalid credentials', 'BAD_CREDENTIALS');

  const matches = await user.comparePassword(password);
  if (!matches) throw AppError.unauthorized('Invalid credentials', 'BAD_CREDENTIALS');

  return issueAuth(user);
}

async function getById(userId) {
  const user = await User.findById(userId);
  if (!user) throw AppError.notFound('User not found');
  return user;
}

/** Mint a JWT carrying the minimal claims we need to authorize later requests/sockets. */
function issueAuth(user) {
  const token = signToken({ sub: user.id, email: user.email });
  return { token, user: user.toJSON() };
}

export const authService = { register, login, getById };
