/* eslint-disable linebreak-style */
import Agent from '../models/agent.js';
import Transfert from '../models/transfert.js';
import { NotFoundError, BadRequestError } from '../../errors/index.js';

//RENDER ALL AGENTS OF THE WEB APP PAGE ONLY FOR ADMIN
const getAllAgents = async (req, res, next) => {
    try {
        let { senderName, senderCode, phoneNumber, page, size } = req.query;

        const queryObj = {};

        if (senderName)
            queryObj.senderName = { $regex: senderName, $options: 'i' };

        if (senderCode)
            queryObj.senderName = { $regex: senderCode, $options: 'i' };

        if (phoneNumber) queryObj.phoneNumber = phoneNumber;

        page = page ? Number(page) : 1;
        size = size ? Number(size) : 16;

        const limit = size;
        const skip = (page - 1) * size;
        const agents = await Agent.find(queryObj)
            .sort({ _id: -1 })
            .limit(limit)
            .skip(skip);
        const count = await Agent.count(queryObj);

        let totalPages = Math.ceil(count / limit);

        let iterator = page - 2 < 1 ? 1 : page - 2;
        let endingLink =
            iterator + 4 <= totalPages
                ? iterator + 4
                : page + (totalPages - page);

        res.status(200).json({
            totalPages,
            currentPage: page,
            iterator,
            endingLink,
            agents,
        });
    } catch (error) {
        next(error);
    }
};

//CREATE NEW AGENT INTO DATABASE
const createAgent = async (req, res, next) => {
    try {
        const { phoneNumber, senderName, senderCode } = req.body;
        if (!senderName || !senderCode)
            return next(
                new BadRequestError('Veuillez remplir tous les champs')
            );
        const agent = await Agent.findOne({ senderName });
        const code = await Agent.findOne({ senderCode });
        if (agent) return next(new BadRequestError("Nom d'agent déjà pris"));
        if (code) return next(new BadRequestError('Code agent déjà pris'));

        await Agent.create({ ...req.body });
        res.status(201).json({
            message: 'Nouveaul Agent crée',
            status: true,
        });
    } catch (error) {
        next(error);
    }
};

//DELETE AGENT FROM DATABASE
const deleteAgent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const agent = await Agent.findByIdAndDelete(id);

        if (!agent) {
            return next(
                new NotFoundError(`Il n'existe aucun agent avec l'id : ${id}`)
            );
        }

        res.status(200).json({
            message: 'Agent supprimé avec succès',
            status: true,
        });
    } catch (error) {
        next(error);
    }
};

// EDIT FORM ONLY AVAILABLE FOR SPECIFIC LEVEL OF USER LIKE HIGH LEVEL ADMIN OR LOW LEVEL ADMIN
const editAgent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { senderName, phoneNumber } = req.body;
        const agent = await Agent.findById(id);
        const transferts = await Transfert.find({
            createdBy: id,
        });

        //CHECK IF AGENT EXIST
        if (!agent) {
            return next(
                new NotFoundError(`Il n'existe aucun agent avec l'id : ${id}`)
            );
        }

        //CHECK IF THERE IS TRANSFERT LINKED TO THIS AGENT IF IT THE CASE THEN SENDERNAME WILL BE UPDATED THROUGH ALL OF THE PREVIOUS TRANSFERT LINKED TO THAT AGENT
        if (transferts) {
            await Transfert.updateMany(
                { createdBy: id },
                {
                    senderName: senderName,
                },
                {
                    new: true,
                    runValidators: true,
                }
            );
        }

        //THEN UPDATE THE AGENT
        await Agent.updateOne(
            { _id: id },
            { ...req.body },
            {
                new: true,
                runValidators: true,
            }
        );

        res.status(200).json({
            message: 'Agent modifié avec succès',
            status: true,
        });
    } catch (error) {
        next(error);
    }
};

const resetTransfertCount = async (req, res, next) => {
    try {
        await Agent.updateMany(
            {},
            {
                transfertCounts: 0,
            },
            { runValidators: true, new: true }
        );
    } catch (error) {
        next(error);
    }
};

export { getAllAgents, createAgent, deleteAgent, editAgent , resetTransfertCount};
