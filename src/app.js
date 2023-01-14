import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import joi from 'joi';

dotenv.config();
const app = express();
app.use(express.json());
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


app.post("/participants", async (req, res) => {
    try
    {
        const { name } = req.body;
        const users = await db.collection("participants").findOne({ name });
        if (users) return res.status(409).send("usuário já cadastrado");
        await db.collection("participants").insertOne({
            name: name,
            lastStatus: Date.now()
        });
        res.sendStatus(201);
    }
    catch (err)
    {
        res.status(500).send(err);
    }
});

app.get("/participants", async (_, res) => {
    try
    {
        res.send(await db.collection("participants").find().toArray());
    } catch (err)
    {
        return res.send(err.message);
    }
});

app.post("/messages", async (req, res) => {
    try
    {
        const { to, text, type } = req.body;
        const from = req.headers.user;
        const message = { to, text, type, from, time: dayjs().format("hh:mm:ss") };
        console.log(message);
        await db.collection("messages").insertOne(message);
        res.sendStatus(201);
    } catch (err)
    {
        return res.send(err.message);
    }
});

app.get("/messages", async (req, res) => {
    try
    {
        const limit = parseInt(req.query.limit) || 0;
        const from = req.headers.user;

        const messages = await db.collection("messages").find({
            $or: [
                { type: 'public' },
                { type: "private_message", from },
                { type: "private_message", to: from }
            ]
        }).toArray();

        res.send(messages.slice(-limit));
    } catch (err)
    {
        res.send(err);
    }
});

app.post("/status", async (req, res) => {
    try {
        const name = req.headers.user;
        if (await db.collection("participants").findOne({ name }))
        {
            await db.collection("participants").updateOne({ name }, { $set: { lastStatus: Date.now() } });
            res.sendStatus(200);
        }
        else
        {
            res.sendStatus(404);
        }
    } catch (err) {
        res.send(err);
    }
})


app.listen(5000, () => console.log("servidor conectado"));
