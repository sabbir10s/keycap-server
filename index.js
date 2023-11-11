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
        const productCollection = client.db('NEXIQ').collection('products');
        const userCollection = client.db('NEXIQ').collection('users');
        const orderCollection = client.db('NEXIQ').collection('orders');
        const reviewCollection = client.db('NEXIQ').collection('reviews');
        const paymentCollection = client.db('NEXIQ').collection('payments');

        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requestAccount = await userCollection.findOne({ email: requester });

            if (requestAccount.role === 'admin') {
                next();
            }
            else {
                res.send(403).send({ message: 'forbidden access' });
            }
        }



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

        // Delete Product
        app.delete('/product/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(query);
            res.send(result);
        })



        //=========================
        //      user section
        //=========================

        // update user information (admin)
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            }
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
            res.send({ result, token });
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



        // Make an admin (admin)
        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            }
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })


        // check user admin or not (all)
        app.get('/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin });
        })


        // Delete User(admin)
        app.delete('/user/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await userCollection.deleteOne(query);
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
    res.send("Running the NEXIQ Server");
})

app.listen(port, () => {
    console.log("server is running");
})