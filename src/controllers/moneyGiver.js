/* eslint-disable linebreak-style */
import Transfert from '../models/transfert.js';
import { BadRequestError, NotFoundError } from '../../errors/index.js';
import moment from 'moment';
import 'moment/locale/fr.js';
//CHECK TRANSFERT INTO DATABASE AND AUTOMATICALLY CHANGE TRUE TO HASTAKEMONEY FIELD SO THAT WE KNOW THAT PEOPLE HAVE TAKE THE MONEY
const validateTransfertPage = async (req, res, next) => {
    try {
        const { code } = req.body;
        const { moneyGiverCity } = req.user;
        const transfert = await Transfert.findOne({ code });
        if (!code) {
            return next(new BadRequestError('Veuilllez entre un code'));
        }
        if (!transfert) {
            return next(new NotFoundError('Aucun transfert trouvé'));
        }

        if (transfert.city != moneyGiverCity) {
            return next(
                new BadRequestError('Vous ne pouvez pas gérer ce transfert')
            );
        }

        if (transfert.hasTakeMoney) {
            return next(
                new BadRequestError(
                    `Le transfert Recherché a déjà été validé à la date du ${
                        transfert.payoutDay
                            ? moment(transfert.payoutDay).format('L')
                            : ''
                    }`
                )
            );
        }

        res.status(200).json({
            success: true,
            transfert,
            transfertFoundId: transfert._id,
        });
    } catch (error) {
        next(error);
    }
};

const moneyTaken = async (req, res, next) => {
    try {
        const { moneyGiverCity } = req.user;
        let { page, size, clientName, senderName, start, end, moneyTypes } =
            req.query;
        let queryObj = {};

        if (clientName)
            queryObj.clientName = { $regex: clientName, $options: 'i' };

        if (senderName && senderName !== 'Tous') {
            queryObj.senderName = senderName;
        }

        if (moneyTypes && moneyTypes !== 'Tous') {
            queryObj.moneyTypes = moneyTypes;
        }

        const startOfMonth = new Date(
            moment().startOf('month').format('YYYY-MM-DD')
        );
        let endOfMonth = moment().endOf('month').format('YYYY-MM-DD');

        const endCurrMonthY = Number(endOfMonth.split('-')[0]);
        const endCurrMonthM = Number(endOfMonth.split('-')[1]) - 1;
        const endCurrMonthD = Number(endOfMonth.split('-')[2]);

        endOfMonth = new Date(
            endCurrMonthY,
            endCurrMonthM,
            endCurrMonthD,
            25,
            59,
            59,
            999
        );

        const date = {};

        if (start || end) {
            const endYear = Number(end.split('-')[0]);
            const endMonth = Number(end.split('-')[1]) - 1;
            const endDay = Number(end.split('-')[2]);
            date.start = new Date(start);
            date.end = new Date(endYear, endMonth, endDay, 25, 59, 59, 999);
        }

        if (start) queryObj.date = { $gte: date.start };
        if (end) queryObj.date = { $lte: date.end };

        if (start && end) {
            queryObj.date = {
                $gte: date.start,
                $lte: date.end,
            };
        }

        page = page ? Number(page) : 1;
        size = size ? Number(size) : 11;
        //TRANSFORM QUERY INTO URI ENCODE STRING TO BE ABLE TO QUERY NEXT PAGE WITHOUT GETTING RESET
        let sum = await Transfert.aggregate([
            {
                $match: {
                    date: {
                        $gte: startOfMonth,
                        $lte: endOfMonth,
                    },
                    ...queryObj,
                    city: moneyGiverCity,
                    hasTakeMoney: true,
                },
            },
            { $group: { _id: null, sum: { $sum: '$amountOfMoneyInEuro' } } },
        ]);
        if (sum[0] !== undefined) {
            sum = sum[0].sum;
        }

        const limit = size;
        const skip = (page - 1) * size;
        const transferts = await Transfert.find({
            date: {
                $gte: startOfMonth,
                $lte: endOfMonth,
            },
            ...queryObj,
            hasTakeMoney: true,
            city: moneyGiverCity,
        })
            .sort({ date: -1 })
            .limit(limit)
            .skip(skip);
        const count = await Transfert.count({
            date: {
                $gte: startOfMonth,
                $lte: endOfMonth,
            },
            ...queryObj,
            city: moneyGiverCity,
            hasTakeMoney: true,
        });
        let totalPages = Math.ceil(count / limit);

        let iterator = page - 2 < 1 ? 1 : page - 2;
        let endingLink =
            iterator + 4 <= totalPages
                ? iterator + 4
                : page + (totalPages - page);

        res.status(200).json({
            transferts,
            totalPages,
            currentPage: page,
            iterator,
            endingLink,
            sum,
        });
    } catch (error) {
        next(error);
    }
};

// VALIDATE TRANSFERT
const validateTransfert = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { contactNumber } = req.body;

        const transfert = await Transfert.findById(id);
        const { hasTakeMoney, payoutDay } = transfert;

        if (!contactNumber)
            return next(new BadRequestError('Numéro de contact obligatoire'));

        if (hasTakeMoney)
            return next(
                new BadRequestError(
                    `Transfert déjà validé à la date du ${payoutDay.toLocaleDateString()}`
                )
            );

        if (!transfert) {
            return next(
                new NotFoundError(`Le transfert avec l'ID : ${id} n'existe pas`)
            );
        }

        await Transfert.findByIdAndUpdate(
            id,
            {
                payoutDay: new Date(),
                contactNumber,
                hasTakeMoney: true,
            },
            {
                runValidators: true,
                new: true,
            }
        );

        res.status(200).json({
            message: 'Transfert validé !',
            status: 'sucess',
        });
    } catch (error) {
        next(error);
    }
};

export { validateTransfert, validateTransfertPage, moneyTaken };
