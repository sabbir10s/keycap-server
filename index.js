const express = require('express');
const app = express();
require('dotenv').config()

const port = process.env.PROT || 5000;

const cors = require('cors');
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send("Running the NEXIQ Server");
})

app.listen(port, () => {
    console.log("CRUD server is running");
})