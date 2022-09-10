/* eslint-disable no-unused-vars */
/* eslint-disable linebreak-style */
import dotenv from 'dotenv';
dotenv.config();
//MONGOOSE DB
import mongoose from 'mongoose';
import express from 'express';
const app = express();

const connectDB = url => {
  return mongoose.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
};

// SECURITY MIDDLEWARE
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 400,
  })
);
app.use(helmet.hidePoweredBy());
app.use(helmet.crossOriginEmbedderPolicy());
app.use(hpp());
app.use(corsOptions);
app.use(xss());

//PORT VARIABLES
const port = process.env.PORT || 1000;

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(express.json({ limit: '1kb' }));
// app.use(express.static(path.resolve(process.cwd(), 'client/build')));

app.use(morgan('dev'));
// app.get('*', (req, res) => {
//     res.sendFile(path.resolve(process.cwd(), 'client/build', 'index.html'));
// });

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

let link =
  process.env.TEST == 'true' ? process.env.TEST_LINK : process.env.MONGO_LINK;

const start = async (req, res) => {
  try {
    connectDB(link);
    app.listen(process.env.PORT || 1000, '0.0.0.0', () =>
      console.log(`Server is listening on port : ${port}`)
    );
  } catch (error) {
    console.log(error);
  }
};

start();
