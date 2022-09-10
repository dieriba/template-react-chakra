/* eslint-disable prettier/prettier */
const errorHandler = (err, req, res, next) => {
    let customError = {
        // set default
        statusCode: err.statusCode || 500,
        msg:
            err.message ||
            'Une erreur est survenue, Veuillez réessayer plus tard',
    };
    if (err.name === 'ValidationError') {
        customError.msg = Object.values(err.errors)
            .map((item) => item.message)
            .join(',');
        customError.statusCode = 400;
    }
    if (err.code && err.code === 11000) {
        customError.msg = `La valeur pour le/les ${Object.keys(
            err.keyValue
        )} est/sont déjà prises, Veuillez en choisir des autres`;
        customError.statusCode = 400;
    }
    if (err.name === 'CastError') {
        customError.msg = `Aucun ID avec la valeur: ${err.value}`;
        customError.statusCode = 404;
    }

    return res.status(customError.statusCode).json({ msg: customError.msg });
};

export default errorHandler;
