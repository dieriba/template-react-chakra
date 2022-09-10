/* eslint-disable prettier/prettier */
const notFoundMiddleware = (req, res) => {
    res.status(404).json({
        message: "La page que vous recherchez n'existe pas",
    });
};

export default notFoundMiddleware;
