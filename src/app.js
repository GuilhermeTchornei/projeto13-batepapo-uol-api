import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(cors());
const mongoClient = new MongoClient(process.env.DATABASE_URL);

try
{
    await mongoClient.connect();
    console.log("banco conectado");
}
catch(err) {
    console.log(err);
}

const db = mongoClient.db();

app.listen(5000, () => console.log("servidor conectado"));
