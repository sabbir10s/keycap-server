const express = require('express');
const app = express();
require('dotenv').config()

const port = process.env.PROT || 5000;

const cors = require('cors');
app.use(cors())
app.use(express.json())

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iqqeord.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// client.connect(err => {
//     const collection = client.db("test").collection("devices");
//     // perform actions on the collection object
//     client.close();
// });

async function run() {
    try {
        await client.connect()
        console.log("NEXIQ Connected");
        const productCollection = client.db('NEXIQ').collection('products');

        app.get('/product', async (req, res) => {
            const query = {};
            const products = await productCollection.find(query).toArray();
            res.send(products);
        })
    }
    finally {

    }

}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("Running the NEXIQ Server");
})

app.listen(port, () => {
    console.log("CRUD server is running");
})