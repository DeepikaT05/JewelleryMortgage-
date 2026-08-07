const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ message: 'No authorization token, access denied' });
  }

  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No token found in Bearer scheme' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'girvi_secret_key_2026_998811';
    const decoded = jwt.verify(token, secret);
    
    const User = require('../models/User');
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found, authorization denied' });
    }

    // Check if the company exists; if not, associate with the first company
    const Company = require('../models/Company');
    let companyExists = user.companyId ? await Company.findById(user.companyId) : null;
    if (!companyExists) {
      const firstCompany = await Company.findOne();
      if (firstCompany) {
        user.companyId = firstCompany._id;
        await user.save();
      }
    }

    req.user = {
      id: user._id,
      userId: user.userId,
      username: user.username,
      role: user.role,
      companyId: user.companyId
    };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token verification failed, authorization denied' });
  }
};

module.exports = authMiddleware;
