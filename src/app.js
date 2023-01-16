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
catch (err)
{
    console.log(err);
}

const db = mongoClient.db();


app.post("/participants", async (req, res) => {
    try
    {
        const { name } = req.body;

        const nameSchema = joi.object({ name: joi.string().required() });
        const validation = nameSchema.validate({name});
        if (validation.error) return res.status(422).send(validation.error);

        const users = await db.collection("participants").findOne({ name });
        if (users) return res.status(409).send("usuário já cadastrado");

        await db.collection("participants").insertOne({
            name: name,
            lastStatus: Date.now()
        });

        await db.collection("messages").insertOne({
            from: name,
            to: 'Todos',
            text: "entra na sala...",
            type: 'status',
            time: dayjs().format("hh:mm:ss")
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

        if (!await db.collection("participants").findOne({ name: from })) return res.sendStatus(422);
        const messageSchema = joi.object({
            to: joi.string().required(),
            text: joi.string().required(),
            type: joi.string().valid('message', 'private_message').required(),
            from: joi.string().required()
        });

        const message = { to, text, type, from };
        const validation = messageSchema.validate(message, { abortEarly: false });
        if (validation.error) return res.status(422).send(validation.error);
        await db.collection("messages").insertOne({...message, time: dayjs().format("hh:mm:ss")});
        res.sendStatus(201);
    } catch (err)
    {
        return res.status(422).send(err.message);
    }
});

app.get("/messages", async (req, res) => {
    try
    {
        const limit = parseInt(req.query.limit || 0);
        const from = req.headers.user;

        if (isNaN(limit) || limit < 0) return res.sendStatus(422);

        const messages = await db.collection("messages").find({
            $or: [
                { type: 'message' },
                { type: 'status' },
                { type: "private_message", from },
                { type: "private_message", to: from }
            ]
        }).toArray();

        res.send(messages.slice(-limit).reverse());
    } catch (err)
    {
        res.status(500).send(err);
    }
});

app.post("/status", async (req, res) => {
    try
    {
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
    } catch (err)
    {
        res.send(err);
    }
});

setInterval(async () => {
    try
    {
        const participants = await db.collection("participants").find().toArray();
        const afkParticipants = participants.filter((p) => {
            if (p.lastStatus < Date.now() - 10000)
            {
                db.collection("messages").insertOne({
                    from: p.name,
                    to: 'Todos',
                    text: "sai da sala...",
                    type: 'status',
                    time: dayjs().format("hh:mm:ss")
                });
                return p;
            }
            else return null;
        }).map(p => p.name);
        await db.collection("participants").deleteMany({ name: { $in: afkParticipants } });
    } catch (err)
    {
        console.log(err);
    }
}, 15000);


app.listen(5000, () => console.log("servidor conectado"));
