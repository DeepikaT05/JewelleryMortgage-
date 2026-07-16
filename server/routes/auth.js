const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');
const Counter = require('../models/Counter');
const authMiddleware = require('../middleware/auth');

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Please enter username and password' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    if (!user.isActive) {
      return res.status(400).json({ message: 'User account is deactivated' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    // Sign JWT
    const payload = {
      id: user._id,
      userId: user.userId,
      username: user.username,
      role: user.role,
      companyId: user.companyId
    };

    const secret = process.env.JWT_SECRET || 'girvi_secret_key_2026_998811';
    jwt.sign(payload, secret, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({
        token,
        user: {
          id: user._id,
          userId: user.userId,
          name: user.name,
          username: user.username,
          role: user.role,
          companyId: user.companyId
        }
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   POST /api/auth/register
// @desc    Register a new user (Admin only if any users exist)
router.post('/register', async (req, res) => {
  const { name, username, password, role, companyId } = req.body;

  if (!name || !username || !password) {
    return res.status(400).json({ message: 'Please enter name, username, and password' });
  }

  try {
    // Check if user already exists
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Encrypt password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Get auto-incremented userId
    let counter = await Counter.findOneAndUpdate(
      { id: 'userId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const newUser = new User({
      userId: counter.seq,
      name,
      username,
      role: role || 'operator',
      companyId,
      passwordHash
    });

    await newUser.save();
    res.status(201).json({ message: 'User registered successfully', userId: newUser.userId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user details
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error checking session' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side handles actual token clearance)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// @route   GET /api/auth/users
// @desc    List all users (Admin/Super Admin only)
router.get('/users', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super admin') {
    return res.status(403).json({ message: 'Admin role required' });
  }
  try {
    const users = await User.find().populate('companyId').select('-passwordHash');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving users', error: err.message });
  }
});

// @route   PUT /api/auth/users/:id
// @desc    Update user details (Admin/Super Admin only)
router.put('/users/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super admin') {
    return res.status(403).json({ message: 'Admin role required' });
  }
  const { name, role, companyId, isActive, password } = req.body;
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (name) user.name = name;
    if (role) user.role = role;
    
    // For super admin, companyId might be empty or null
    if (role === 'super admin') {
      user.companyId = undefined;
    } else if (companyId) {
      user.companyId = companyId;
    }
    
    if (isActive !== undefined) user.isActive = isActive;
    
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(password, salt);
    }
    
    await user.save();
    res.json({ message: 'User updated successfully', user });
  } catch (err) {
    res.status(500).json({ message: 'Error updating user', error: err.message });
  }
});

// @route   DELETE /api/auth/users/:id
// @desc    Delete a user (Admin/Super Admin only)
router.delete('/users/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super admin') {
    return res.status(403).json({ message: 'Admin role required' });
  }
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting user', error: err.message });
  }
});

module.exports = router;
