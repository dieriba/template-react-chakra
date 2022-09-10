import {
    UnauthenticatedError,
    NotFoundError,
    UnauthorizedError,
} from '../../errors/index.js';
import jwt from 'jsonwebtoken';
import User from '../models/user.js';

const auth = async (req, res, next) => {
    const authHeaders = req.headers.authorization;

    if (!authHeaders || !authHeaders.startsWith('Bearer'))
        return next(new UnauthenticatedError('Authentication invalid'));
    const token = authHeaders.split(' ')[1];
    try {
        const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(payload.userId);
        user.password = undefined;
        if (!user || user.isBanned)
            return next(new UnauthorizedError('Authentication Invalid'));
        req.user = payload;
        req.token = { token, user, userRole: user.role };
    } catch (error) {
        next(new UnauthenticatedError('Authentication not valid'));
    }

    next();
};

export default auth;
