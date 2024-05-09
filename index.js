const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const cors = require('cors');
const port = process.env.PORT || 3000;
const app = express();

// middlewares
app.use(cors(
  {
    origin: ['http://localhost:5173', 'https://phone-arena-b3591.web.app', 'https://phone-arena-b3591.firebaseapp.com'],
    credentials: true
  }
));
app.use(express.json());
app.use(cookieParser());

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5yhhqym.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const db = client.db("phoneDB");
const coll = db.collection("phones");
const collOrders = db.collection("orders");

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  console.log(token);
  if (!token) {
    return res.status(401).send({message: 'unauthorized access'});
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({message: 'unauthorized access'});
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // await client.connect();

    app.post('/jwt', async (req, res) => {
      const user = req.body.user;
      const token = jwt.sign({ data: user }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.cookie('token', token, cookieOptions).send({success: true});
    });

    app.post('/logout', (req, res) => {
        console.log('logged out', req.body.email);
        res.clearCookie('token', { ...cookieOptions, maxAge: 0 }).send({success: true});
    });

    app.post('/order', async (req, res) => {
      const result = await collOrders.insertOne(req.body);
      res.send(result);
    });

    app.get('/', async (req, res) => {
      res.send('Welcome to phoneDB');
    });

    app.get('/phones', async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const result = await coll.find().skip((page - 1) * size).limit(size).toArray();
      res.send(result);
    });

    app.get('/count', async (req, res) => {
      const count = await coll.estimatedDocumentCount();
      res.send({ count });
    });

    app.get('/orders', verifyToken, async (req, res) => {
      if (req.query.email !== req.user.data) {
        return res.status(403).send({message: 'Forbidden access'});
      }
      const query = {userEmail: req.query.email};
      const result = await collOrders.find(query).toArray();
      res.send(result);
  });
    
  } 
  finally {
    
  }
}
run().catch(console.dir);

app.listen(port);