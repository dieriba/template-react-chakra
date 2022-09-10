/* eslint-disable linebreak-style */
/* eslint-disable quotes */
import User from '../models/user.js';
import { BadRequestError } from '../../errors/index.js';

//LOGIN WHERE ALL USER WILL BE REDIRECT IF THEY DO NOT HAVE COOKIES YET, IF THEY HAVE THEY WILL BE REDIRECT TO THEIR MAIN DASHBOARD AND THEY Can't ACESS OTHERS DASHBOARD
const auth = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password)
            return next(
                new BadRequestError('Veuillez remplir tous les champs')
            );

        const user = await User.findOne({ username });

        if (!user) return next(new BadRequestError('Champs Incorrects'));

        const isSamePassword = await user.comparePassword(password);
        if (!isSamePassword)
            return next(new BadRequestError('Champs Incorrects'));

        user.password = undefined;
        const userRole = user.role;
        const token = user.createJWT({
            userId: user._id,
            userAgentId: user.LinkedToAgentId?.toString() || null,
            moneyGiverCity: user.role === 'moneyGiver' ? user.username : null,
            userRole: user.role,
        });

        res.status(200).json({ user, token, userRole });
    } catch (error) {
        next(error);
    }
};

export { auth };
