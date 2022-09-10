/* eslint-disable linebreak-style */
import MoneyTaker from '../models/moneyTaker.js';
import { NotFoundError } from '../../errors/index.js';

//Render LIST OF MONEY TAKERS
const getAllMoneyTakers = async (req, res, next) => {
    try {
        let { page, size, name } = req.query;

        let queryObj = {};

        if (name) queryObj.name = { $regex: name, $options: 'i' };

        page = page ? Number(page) : 1;
        size = size ? Number(size) : 15;

        //TRANSFORM QUERY INTO URI ENCODE STRING TO BE ABLE TO QUERY NEXT PAGE WITHOUT GETTING RESET

        const limit = size;
        const skip = (page - 1) * size;

        const moneyTakers = await MoneyTaker.find(queryObj)
            .sort({ date: -1 })
            .limit(limit)
            .skip(skip);
        const count = await MoneyTaker.count(queryObj);
        let totalPages = Math.ceil(count / limit);

        let iterator = page - 2 < 1 ? 1 : page - 2;
        let endingLink =
            iterator + 4 <= totalPages
                ? iterator + 4
                : page + (totalPages - page);

        res.status(200).json({
            moneyTakers,
            totalPages,
            currentPage: page,
            iterator,
            endingLink,
        });
    } catch (error) {
        next(error);
    }
};

//CREATE A NEW MONEY TAKER IN DATABASE
const addMoneyTaker = async (req, res, next) => {
    try {
        const { amountMoney } = req.body;
        const moneyTaker = await MoneyTaker.create(req.body);

        const { code } = moneyTaker;
        res.status(201).json({
            message: `Code : ${code}, Montant : ${amountMoney.toLocaleString()} € , Contact : 06.41.47.89.23`,
            status: true,
        });
    } catch (error) {
        next(error);
    }
};

//

// EDIT FORM ONLY AVAILABLE FOR SPECIFIC LEVEL OF USER LIKE HIGH LEVEL ADMIN OR LOW LEVEL ADMIN
const editMoneyTaker = async (req, res, next) => {
    try {
        const { id } = req.params;
        const moneyTaker = await MoneyTaker.findOneAndUpdate(
            { _id: id },
            req.body,
            {
                new: true,
                runValidators: true,
            }
        );

        if (!moneyTaker) {
            return next(
                new NotFoundError(
                    "Il n'existe pas de récupérateurs avec cet ID"
                )
            );
        }

        res.status(200).json({
            message: 'Récupérateur Modifié avec succès',
            status: true,
        });
    } catch (error) {
        next(error);
    }
};

//DELETE SPECIFIC MONEY TAKER OF DB ONLY AVAILABLE FOR HIGH USER ADMIN AND MED LEVEL ADMIN
const deleteMoneyTaker = async (req, res, next) => {
    try {
        const { id } = req.params;
        const moneyTaker = await MoneyTaker.findByIdAndDelete(id);

        if (!moneyTaker) {
            return next(
                new NotFoundError(
                    "Il n'existe pas de récupérateurs avec cet ID"
                )
            );
        }

        res.status(200).json({
            message: 'Money Taker has been deleted with success',
            status: 'sucess',
        });
    } catch (error) {
        next(error);
    }
};

export { addMoneyTaker, getAllMoneyTakers, editMoneyTaker, deleteMoneyTaker };
