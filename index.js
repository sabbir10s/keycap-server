const express = require('express')
const cors = require('cors');

require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iqqeord.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorize access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' });
        }
        req.decoded = decoded;
        next();
    });
}



async function run() {

    try {
        client.connect()
        const productCollection = client.db('keycap').collection('products');
        const userCollection = client.db('keycap').collection('users');
        const orderCollection = client.db('keycap').collection('orders');
        const reviewCollection = client.db('keycap').collection('reviews');
        const paymentCollection = client.db('keycap').collection('payments');



        // Post Token
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
            res.send({ token })

        })

        // Verify Admin
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email
            const query = { email: email }
            const user = await userCollection.findOne(query)
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' })
            }
            next()
        }


        // check admin or not
        app.get('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                return res.send({ admin: false })
            }
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user?.role === 'admin';
            res.send({ admin: isAdmin });
        })



        //=========================
        //      user section
        //=========================

        // post user information when logIn
        app.post('/user', async (req, res) => {
            const user = req.body
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: 'user already exist' })
            }
            const result = await userCollection.insertOne(user)
            res.send(result)
        })


        // update user information
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            }
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        // Make an admin (admin)
        app.patch('/user/admin/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: { role: 'admin' },
            }
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // Delete User(admin)
        app.delete('/user/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.send(result);
        })

        // Get All users (admin)
        app.get('/user', verifyJWT, verifyAdmin, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        })

        // Get single user by email
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const user = await userCollection.findOne(filter);
            res.send(user);
        })




        // =========================
        //      product section
        // =========================

        // Fiend All Products
        app.get('/product', async (req, res) => {
            const query = {};
            const products = await productCollection.find(query).toArray();
            res.send(products);
        })

        // Fiend Single Product by Product ID
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) };
            const product = await productCollection.findOne(query);
            res.send(product);
        })

        // Add new product product
        app.post('/product', verifyJWT, verifyAdmin, async (req, res) => {
            const product = req.body;
            const result = await productCollection.insertOne(product);
            res.send(result);
        })

        // Update product

        app.patch('/product/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: { published: !published },
            }
            const result = await productCollection.updateOne(filter, updateDoc);
            console.log(result);
            // res.send(result);
        })

        // Delete Product
        app.delete('/product/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(query);
            res.send(result);
        })



        //=======================
        //   order section (user)
        //=======================

        // Post a order (User)
        app.post('/user/order', verifyJWT, async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        })

        // Get user ordered product by email (user)
        app.get('/user/order/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            console.log(email);
            const query = { email: email };
            const result = await orderCollection.find(query).toArray();
            res.send(result);
        })

        // // get single order by id (User)
        // app.get('/order/email/:id', verifyJWT, async (req, res) => {
        //     const id = req.params.id;
        //     const query = { _id: ObjectId(id) };
        //     const result = await orderCollection.findOne(query);
        //     console.log(result);
        //     res.send(result);
        // })

        // Delete Order (User) 
        app.delete("user/order/email/:id", verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        })


        //=======================
        // order section (admin)
        //=======================

        // Get All Order (Admin) 
        app.get('/order', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {};
            const result = await orderCollection.find(query).toArray();
            res.send(result);
        })

        //Get single order by id (Admin, User)
        app.get('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.findOne(query);
            res.send(result);
        })

        // Update user oder status (Admin)
        app.put('/admin/order/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const value = req.body.status
            const updateDoc = {
                $set: {
                    status: value
                }
            }
            const result = await orderCollection.updateOne(query, updateDoc);
            res.send(result)
        })

        // Delete Order (Admin) 
        app.delete("/admin/order/:id", verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        })


        //=======================
        //     reviews section
        //=======================

        // get all reviews
        app.get('/review', async (req, res) => {
            const query = {};
            const reviews = await (await reviewCollection.find(query).toArray()).reverse()
            res.send(reviews);
        })

        // post new review
        app.post('/review', verifyJWT, async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        })



        //==========================
        // Payment Section
        //==========================

        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const order = req.body;
            const price = parseInt(order.totalAmount);
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        })

        //Store Payment information 
        app.patch('/order/email/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const payment = req.body;
            const filter = { _id: ObjectId(id) }
            const updateDoc = {
                $set: {
                    payment: {
                        status: true,
                        method: 'card',
                        transactionId: payment.transactionId
                    },

                },
            }
            console.log(updateDoc);
            const result = await paymentCollection.insertOne(payment)
            const updatedOrder = await orderCollection.updateOne(filter, updateDoc);

            res.send(updateDoc)

        })




    }
    finally {

    }

}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("Running the Keycap Server");
})

app.listen(port, () => {
    console.log("server is running");
})