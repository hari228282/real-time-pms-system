import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true, // "projects I own"
    },
    // Embedded membership: small, bounded list, always read together with the project.
    members: { type: [memberSchema], default: [] },
  },
  { timestamps: true }
);

// "projects I'm a member of" + powers membership/authorization lookups.
projectSchema.index({ 'members.user': 1 });

projectSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const Project = mongoose.model('Project', projectSchema);
