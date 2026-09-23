const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Deliberately minimal — user management/auth is not the focus of this
 * assignment. In a real system this would live in its own service and the
 * Competition backend would only ever see a verified userId from the JWT.
 */
const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    avatarUrl: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
