/* eslint-disable linebreak-style */
import Transfert from '../models/transfert.js';
import Agent from '../models/agent.js';
import Rate from '../models/rates.js';
import User from '../models/user.js';
import calculFees from '../../utils/calculFees.js';
import { NotFoundError, BadRequestError } from '../../errors/index.js';
import bcrypt from 'bcryptjs';
import checkPermissions from '../../utils/checkPermissions.js';

//RENDER ALL TRANSFERT OF DB
const totalAmountTransfert = async (req, res, next) => {
    try {
        let { senderName, start, end, city, page, size, moneyTypes } =
            req.query;

        //ADD 2 OBJECT THE FIRST ONE IS USED AS QUERY PARAMETER FOR MONGOOSE FUNCTION
        // THE SECOND ONE IS HERE TO PAGINATION SYSTEM AND SEND QUERY STRING TO LINK BUT WITHOUT THE PAGE QUERY TO AVOID BUGS

        let queryObj = {};

        if (city) queryObj.city = city;

        if (senderName)
            queryObj.senderName = { $regex: senderName, $options: 'i' };

        if (moneyTypes) queryObj.moneyTypes = moneyTypes;

        if (start && end) {
            const endYear = Number(end.split('-')[0]);
            const endMonth = Number(end.split('-')[1]) - 1;
            const endDay = Number(end.split('-')[2]);
            const date = {
                start: new Date(start),
                end: new Date(endYear, endMonth, endDay, 25, 59, 59, 999),
            };
            queryObj.date = {
                $gte: date.start,
                $lte: date.end,
            };
        }

        page = page ? Number(page) : 1;
        size = size ? Number(size) : 18;

        //TRANSFORM QUERY INTO URI ENCODE STRING TO BE ABLE TO QUERY NEXT PAGE WITHOUT GETTING RESET

        const limit = size;
        const skip = (page - 1) * size;

        const transferts = await Transfert.find(queryObj)
            .sort({ date: -1 })
            .limit(limit)
            .skip(skip);
        const count = await Transfert.count(queryObj);
        const agents = await Agent.find({});

        let sum = await Transfert.aggregate([
            { $match: queryObj },
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
            totalPages: 4,
            currentPage: page,
            iterator,
            endingLink,
            sum,
            agents,
        });
    } catch (error) {
        next(error);
    }
};

const getToken = async (req, res, next) => {
    try {
        const { token, userRole, user } = req.token;
        res.status(200).json(req.token);
    } catch (error) {
        next(error);
    }
};

//CONVERT VALUE FOR CLIENT
const Convert = async (req, res, next) => {
    try {
        const { rate } = await Rate.findOne({ inUse: true });
        let { euro, gnf } = req.body;
        euro = euro ? euro.replace(/\s+/g, '') : null;
        gnf = gnf ? gnf.replace(/\s+/g, '') : null;

        if (euro) gnf = Number(euro) * rate;

        if (gnf) euro = Number(gnf) / rate;

        const fee = calculFees(euro);

        res.json({
            rate,
            euro,
            gnf,
            fee,
        });
    } catch (error) {
        next(error);
    }
};

//CREATE A NEW TRANSFERT INTO DB ONLY HIGH LEVEL USER AND LOW LEVEL USER CAN CREATE A NEW TRANSFERT
const createTransfert = async (req, res, next) => {
    try {
        const { userAgentId, userRole } = req.user;
        const {
            senderName,
            amountOfMoneyInEuro,
            amountGiven,
            hasFullyPaid,
            city,
            date,
        } = req.body;

        if (!hasFullyPaid && amountGiven >= amountOfMoneyInEuro)
            return next(
                new BadRequestError(
                    'Le montant Donné ne peut être supérieure ou égale à celui envoyé'
                )
            );

        if (userRole === 'agent') {
            const agent = await Agent.findOne({ _id: userAgentId });
            if (!agent) return next(new BadRequestError('Agent non identifié'));
            req.body.createdBy = userAgentId;
            req.body.senderName = agent.senderName;
        }

        if (userRole !== 'agent') {
            const agent = await Agent.findOne({ senderName: senderName });
            console.log(userRole);
            console.log(senderName);
            if (!agent) return next(new BadRequestError('Agent non identifié'));
            req.body.createdBy = agent._id;
        }

        const { rate } = await Rate.findOne({ inUse: true });
        req.body.rate = rate;
        req.body.leftAmountToPay = !hasFullyPaid ? amountOfMoneyInEuro - amountGiven : 0;

        if (!date) {
            req.body.date = !date ? new Date() : new Date(date);
        }

        const transfert = await Transfert.create(req.body);
        const { code } = transfert;

        let moneygiverNumber;

        if (city === 'CONAKRY') moneygiverNumber = '622.34.17.25';
        if (city === 'KINDIA') moneygiverNumber = '624.72.07.08';
        if (city === 'BOKE') moneygiverNumber = '664.51.02.49';
        if (city === 'COLLAB')
            moneygiverNumber = '628.06.92.90 ou 06.83.73.61.19';

        res.status(201).json({
            message: `Code : ${code}, Contactez :${moneygiverNumber}`,
            success: true,
        });
    } catch (error) {
        next(error);
    }
};

const editPassword = async (req, res, next) => {
    try {
        const { userId } = req.user;

        const user = await User.findById(userId);
        const { actualPassword, newPassword, confirmNewPassword } = req.body;

        const isSamePassword = await user.comparePassword(actualPassword);

        if (!isSamePassword) {
            return next(new NotFoundError('Mot de passe actuel Incorrect'));
        }

        if (newPassword !== confirmNewPassword) {
            return next(
                new NotFoundError('Les mots de passes ne correspondent pas')
            );
        }
        if (newPassword.length < 8) {
            return next(
                new NotFoundError(
                    'Le mot de passe doit au moins conternir 8 caractères'
                )
            );
        }

        //HASH PASSWORD
        const salt = await bcrypt.genSalt(10);
        const password = await bcrypt.hash(newPassword, salt);

        await User.findByIdAndUpdate(
            userId,
            { password },
            {
                new: true,
                runValidators: true,
            }
        );

        res.status(200).json({
            status: 'sucess',
            message: 'Mot de passe modifié avec succès',
        });
    } catch (error) {
        next(error);
    }
};

// EDIT FORM ONLY AVAILABLE FOR SPECIFIC LEVEL OF USER LIKE HIGH LEVEL ADMIN OR LOW LEVEL ADMIN
const editTransfert = async (req, res, next) => {
    try {
        const date = Date.now();
        const { id } = req.params;

        const transfert = await Transfert.findById(id);

        if (!transfert) {
            return next(
                new NotFoundError(`Le transfert avec l'ID : ${id} n'existe pas`)
            );
        }
        checkPermissions(req.user, transfert.createdBy);

        const newTransfert = await Transfert.findOneAndUpdate(
            { _id: id },
            { ...req.body, hasBeenModified: true, updatedDate: date },
            {
                new: true,
                runValidators: true,
            }
        );
        res.status(200).json({
            message: 'Transfert modifié avec succès',
            status: true,
        });
    } catch (error) {
        next(error);
    }
};

//DELETE SPECIFIC TRANSFERT OF DB ONLY AVAILABLE FOR HIGH USER ADMIN
const deleteTransfert = async (req, res, next) => {
    try {
        const { id } = req.params;
        const transfert = await Transfert.findById(id);

        //CHECK IF A TRANSFERT IS LINKED TO THE GIVEN ID IF NOT AN ERROR IS RETURNED
        if (!transfert) {
            return next(
                new NotFoundError(`Le transfert avec l'ID : ${id} n'existe pas`)
            );
        }
        checkPermissions(req.user, transfert.createdBy);
        await Transfert.findByIdAndDelete(id);

        res.status(200).json({
            message: 'Transfert supprimé avec succès',
            status: true,
        });
    } catch (error) {
        next(error);
    }
};

const getAgentNames = async (req, res, next) => {
    try {
        const agents = await Agent.find({}).select([
            '-phoneNumber',
            '-transfertCounts',
            '-senderCode',
            '-linkedToUserId',
        ]);

        res.status(200).json(agents);
    } catch (error) {
        next(error);
    }
};

export {
    totalAmountTransfert,
    createTransfert,
    editPassword,
    editTransfert,
    deleteTransfert,
    Convert,
    getAgentNames,
    getToken,
};
