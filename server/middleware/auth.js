const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
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
    req.user = decoded; // Contains { id, userId, username, role, companyId }
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token verification failed, authorization denied' });
  }
};

module.exports = authMiddleware;
