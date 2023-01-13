import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

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
    const { name } = req.body;
    console.log(name);
    try
    {
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
    try {
        res.send(await db.collection("participants").find().toArray());
    } catch (err) {
        return res.send(err);
    }
})


app.listen(5000, () => console.log("servidor conectado"));
