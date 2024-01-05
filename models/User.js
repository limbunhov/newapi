const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userID: { type: Number, unique: true },
  fullName: String,
  email: { type: String, unique: true, required: true },
  password: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
});

// Pre-save hook to generate sequential user IDs
userSchema.pre('save', async function (next) {
  if (!this.userID) {
    try {
      const lastUser = await mongoose.model('User').findOne({}, {}, { sort: { 'userID': -1 } });
      const newUserID = lastUser ? lastUser.userID + 1 : 1;
      this.userID = newUserID;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
