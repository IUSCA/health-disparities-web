function validateProtocols(req, res, next) {
  const protocol_ids = req.user.protocol_ids || [];
  if (protocol_ids.length === 0) {
    return res.status(403).json({ message: 'No protocols assigned to user' });
  }
  if (protocol_ids.length > 1) {
    return res.status(501).send('Support for multiple protocols per user is not available');
  }
  // eslint-disable-next-line prefer-destructuring
  req.user.protocol_id = protocol_ids[0];
  next();
}

module.exports = {
  validateProtocols,
};
