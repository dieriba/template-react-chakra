/* eslint-disable linebreak-style */
import Transfert from '../models/transfert.js';
import Agent from '../models/agent.js';
import moment from 'moment';
import 'moment/locale/fr.js';
import NotFoundError from '../../errors/not-found.js';
import BadRequestError from '../../errors/bad-request.js';
//RENDER ALL TRANSFERT OF DB
const getAllTransferts = async (req, res, next) => {
    try {
        let {
            page,
            size,
            clientName,
            senderName,
            start,
            end,
            city,
            moneyTypes,
            hasTakeMoney,
            hasTakeFilter,
        } = req.query;
        //ADD 2 OBJECT THE FIRST ONE IS USED AS QUERY PARAMETER FOR MONGOOSE FUNCTION
        // THE SECOND ONE IS HERE TO PAGINATION SYSTEM AND SEND QUERY STRING TO LINK BUT WITHOUT THE PAGE QUERY TO AVOID BUGS

        let queryObj = {};

        if (city && city !== 'Tous') {
            queryObj.city = city;
        }
        if (hasTakeFilter !== 'false') {
            if (hasTakeMoney) {
                queryObj.hasTakeMoney = hasTakeMoney === 'true' ? true : false;
            }
        }
        if (clientName) {
            queryObj.clientName = { $regex: clientName, $options: 'i' };
        }
        if (senderName && senderName !== 'Tous') {
            queryObj.senderName = { $regex: senderName, $options: 'i' };
        }
        if (moneyTypes && moneyTypes !== 'Tous') {
            queryObj.moneyTypes = moneyTypes;
        }

        const date = {};


        if (start) 
        {
            date.start = new Date(start);
            queryObj.date = { $gte: date.start };
        }
        if (end) {
            const endYear = Number(end.split('-')[0]);
            const endMonth = Number(end.split('-')[1]) - 1;
            const endDay = Number(end.split('-')[2]);
            date.end = new Date(endYear, endMonth, endDay - 1, 25, 59, 59, 999);
            queryObj.date = { $lte: date.end };
        }

        if (start && end) {
            queryObj.date = {
                $gte: date.start,
                $lte: date.end,
            };
        }

        page = page ? Number(page) : 1;
        size = size ? Number(size) : 11;
        const limit = size;
        const skip = (page - 1) * size;
        const agent = await Agent.find({});
        const transferts = await Transfert.find({
            ...queryObj,
        })
            .sort({ date: -1 })
            .limit(limit)
            .skip(skip);
        const count = await Transfert.count({
            ...queryObj,
        });

        let totalPages = Math.ceil(count / limit);

        let iterator = page - 2 < 1 ? 1 : page - 2;
        let endingLink =
            iterator + 4 <= totalPages
                ? iterator + 4
                : page + (totalPages - page);

        let sum = await Transfert.aggregate([
            {
                $match: {
                    ...queryObj,
                },
            },
            {
                $group: {
                    _id: null,
                    sum: { $sum: '$amountOfMoneyInEuro' },
                },
            },
        ]);

        sum = sum[0] ? sum[0].sum : '';

        res.status(200).json({
            transferts,
            totalPages,
            currentPage: page,
            iterator,
            endingLink,
            agent,
            sum,
        });
    } catch (error) {
        next(error);
    }
};

const getAllMediumAdminTransferts = async (req, res, next) => {
    try {
        let {
            page,
            size,
            clientName,
            senderName,
            start,
            end,
            city,
            moneyTypes,
            hasTakeMoney,
            hasTakeFilter,
        } = req.query;

        //ADD 2 OBJECT THE FIRST ONE IS USED AS QUERY PARAMETER FOR MONGOOSE FUNCTION
        // THE SECOND ONE IS HERE TO PAGINATION SYSTEM AND SEND QUERY STRING TO LINK BUT WITHOUT THE PAGE QUERY TO AVOID BUGS
        let queryObj = {};
        if (city && city !== 'Tous') {
            queryObj.city = city;
        }
        if (hasTakeFilter !== 'false') {
            if (hasTakeMoney) {
                queryObj.hasTakeMoney = hasTakeMoney === 'true' ? true : false;
            }
        }
        if (clientName) {
            queryObj.clientName = { $regex: clientName, $options: 'i' };
        }
        if (senderName && senderName !== 'Tous') {
            queryObj.senderName = { $regex: senderName, $options: 'i' };
        }
        if (moneyTypes && moneyTypes !== 'Tous') {
            queryObj.moneyTypes = moneyTypes;
        }
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

        const limit = size;
        const skip = (page - 1) * size;
        const agent = await Agent.find({});
        const transferts = await Transfert.find({
            city: ['BOKE', 'CONAKRY', 'KINDIA'],
            ...queryObj,
        })
            .sort({ date: -1 })
            .limit(limit)
            .skip(skip);

        const count = await Transfert.count({
            city: ['BOKE', 'CONAKRY', 'KINDIA'],
            ...queryObj,
        });

        let sum = await Transfert.aggregate([
            {
                $match: {
                    city: { $in: ['BOKE', 'CONAKRY', 'KINDIA'] },
                    ...queryObj,
                },
            },
            { $group: { _id: null, sum: { $sum: '$amountOfMoneyInEuro' } } },
        ]);
        if (sum[0] !== undefined) {
            sum = sum[0].sum;
        }
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
            agent,
            sum,
        });
    } catch (error) {
        next(error);
    }
};

const deleteTransfert = async (req, res, next) => {
    try {
        await Transfert.deleteMany();
    } catch (error) {
        next(error);
    }
};

const editLeftAmountTransfert = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { amountGiven } = req.body;
        const transfert = await Transfert.findById(id);

        if (!transfert) return next(new NotFoundError('Transfert non trouvé'));

        const { leftAmount } = transfert;

        if (leftAmount == 0)
            return next(new BadRequestError('Transfert payé en intégralité'));

        if (!amountGiven)
            return next(
                new BadRequestError('Veuillez entrez le montant donné')
            );

        if (amountGiven > leftAmount)
            return next(
                new BadRequestError('Montant Donné supérieurs au montant dû')
            );

        if (amountGiven < 0) {
            return next(new BadRequestError('Montant Donné inférieur à 0'));
        }

        const newVal = leftAmount - amountGiven;

        let message = '';

        if (newVal == 0) {
            message = 'Transfert Payé En Totalité';
        } else {
            message = `Il vous reste à payer la somme de ${newVal}`;
        }

        await Transfert.findByIdAndUpdate(
            id,
            {
                leftAmount: newVal,
                hasFullyPaid: newVal == 0 ? true : false,
            },
            {
                runValidators: true,
                new: true,
            }
        );

        res.json({ message, statut: true });
    } catch (error) {
        next(error);
    }
};

const partiallyPaidTransfert = async (req, res, next) => {
    try {
        let {
            page,
            size,
            clientName,
            senderName,
            start,
            end,
            city,
            moneyTypes,
            hasTakeMoney,
            hasTakeFilter,
        } = req.query;

        //ADD 2 OBJECT THE FIRST ONE IS USED AS QUERY PARAMETER FOR MONGOOSE FUNCTION
        // THE SECOND ONE IS HERE TO PAGINATION SYSTEM AND SEND QUERY STRING TO LINK BUT WITHOUT THE PAGE QUERY TO AVOID BUGS
        let queryObj = {};
        if (city && city !== 'Tous') {
            queryObj.city = city;
        }

        if (clientName) {
            queryObj.clientName = { $regex: clientName, $options: 'i' };
        }
        if (senderName && senderName !== 'Tous') {
            queryObj.senderName = { $regex: senderName, $options: 'i' };
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
        size = size ? Number(size) : 12;

        //TRANSFORM QUERY INTO URI ENCODE STRING TO BE ABLE TO QUERY NEXT PAGE WITHOUT GETTING RESET

        const limit = size;
        const skip = (page - 1) * size;
        const agent = await Agent.find({});
        const transferts = await Transfert.find({
            date: {
                $gte: startOfMonth,
                $lte: endOfMonth,
            },
            city: ['BOKE', 'CONAKRY', 'KINDIA'],
            ...queryObj,
        })
            .sort({ date: -1 })
            .limit(limit)
            .skip(skip);
        const count = await Transfert.count({
            date: {
                $gte: startOfMonth,
                $lte: endOfMonth,
            },
            city: ['BOKE', 'CONAKRY', 'KINDIA'],
            ...queryObj,
        });

        let sum = await Transfert.aggregate([
            {
                $match: {
                    date: {
                        $gte: startOfMonth,
                        $lte: endOfMonth,
                    },
                    city: { $in: ['BOKE', 'CONAKRY', 'KINDIA'] },
                    ...queryObj,
                },
            },
            { $group: { _id: null, sum: { $sum: '$amountOfMoneyInEuro' } } },
        ]);
        if (sum[0] !== undefined) {
            sum = sum[0].sum;
        }
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
            agent,
            sum,
        });
    } catch (error) {
        next(error);
    }
};

export { getAllTransferts, getAllMediumAdminTransferts };
