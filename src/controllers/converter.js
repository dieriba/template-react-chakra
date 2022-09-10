/* eslint-disable linebreak-style */
import Rate from '../models/rates.js';
import { NotFoundError, BadRequestError } from '../../errors/index.js';

const rate = async (req, res, next) => {
    try {
        const { rate } = req.body;

        if (!rate)
            return next(new BadRequestError('Vous devez entrez un taux'));

        const prevRate = await Rate.findOne({ inUse: true });

        if (prevRate) {
            prevRate.inUse = false;
            prevRate.endDate = new Date();
        }
        req.body.inUse = true;
        const newRate = await Rate.create(req.body);
        prevRate ? prevRate.save() : null;

        newRate.save();
        res.status(200).json({
            message: 'Taux modifié avec succès',
            succes: true,
            newRate,
        });
    } catch (error) {
        next(error);
    }
};

const getRate = async (req, res, next) => {
    try {
        const rate = await Rate.findOne({ inUse: true });
        res.status(200).json(rate);
    } catch (error) {
        next(error);
    }
};

export { rate, getRate };
