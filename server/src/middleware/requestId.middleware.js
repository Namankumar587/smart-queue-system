import { v4 as uuidv4 } from 'uuid';

export const requestId = (req, res, next) => {
  const incomingId = req.headers['x-request-id'];
  const currentId = incomingId && typeof incomingId === 'string' && incomingId.trim() ? incomingId.trim() : uuidv4();

  req.id = currentId;
  res.setHeader('X-Request-Id', currentId);
  next();
};
