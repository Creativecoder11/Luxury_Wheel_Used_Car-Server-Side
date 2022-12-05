const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { query } = require('express');
const jwt = require('jsonwebtoken');

const stripe = require("stripe")('sk_test_51M6WjAKJdaP9PucBzpfVZclSKJkOslkgJtAixBjc3um3DUQbSagYdaxABZfnxYnfApQapM4qBsgdYD3J4Adx4UYd00VjDnEwBX');

const app = express()
const port = process.env.PORT || 5000

// middlewares
app.use(cors())
app.use(express.json())

const uri = process.env.URL_SECRET;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
})

function verifyJWT(req, res, next){
  const authHeader =req.headers.authorization;
  if(!authHeader){
    return res.status(401).send('unauthorized access')
  }
  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded) {
    if(err){
      return res.status(403).send({message: 'forbidden access'})
    }
    req.decoded = decoded;
    next();
  })
}

async function run() {
    try {
        const categoryCollection = client.db('luxuryDB').collection('category')
        const productsCollection = client.db('luxuryDB').collection('products')
        const bookingsCollection = client.db('luxuryDB').collection('bookings')
        const usersCollection = client.db('luxuryDB').collection('users')
        // const addproductCollection = client.db('luxuryDB').collection('addproduct')

        
        app.get('/category', async(req, res) => {
          const query= {}
          const result = await categoryCollection.find(query).toArray();
          res.send(result)
        })

        app.get('/products/:id', async(req, res) => {
          const id = req.params.id;
          const query = {categoryId:id};
          const products = await productsCollection.find(query).toArray()
          res.send(products)
        })
        
        app.get("/products", async(req, res)=>{
          const query = {isAdvertise: true};
          const result = await productsCollection.find(query).toArray();
          res.send(result);
        })

        app.put("/products/:id", async(req, res)=>{
          const id = req.params.id;
          const filter ={_id: ObjectId(id)};
          const option = {upsert: true};
          const updatedDoc = {
            $set:{
              isAdvertise: true
            }
          }
          const result = await productsCollection.updateOne(filter, updatedDoc, option);
          res.send(result);
        })

        app.get( '/bookings', verifyJWT, async (req, res) => { 
          const email = req.query.email
          const decodedEmail = req.decoded.email;
          if(email !== decodedEmail){
            return res.status(403).send({message: 'forbidden access'})
          }

          const query = {email : email}
          const bookings = await bookingsCollection.find(query).toArray()
          res.send(bookings)
        })

        app.get('/bookings/:id',async (req, res) => {
          const id = req.params.id;
          const query = {_id: ObjectId(id)}
          const booking = await bookingsCollection.findOne(query)
          res.send(booking)
        })

        app.post('/bookings', async(req, res) => {
          const booking = req.body
          const query = {
            item : booking.item,
            name: booking.name,
            email: booking.email,
          }
          const alreadyBooked = await bookingsCollection.find(query).toArray()
    
          if(alreadyBooked.length){
            const message =`You already have a booked on ${booking.name}`
            return res.send({acknowledged: false, message})
          }
          const result = await bookingsCollection.insertOne(booking);
          res.send(result)
        })
        
        app.get('/addproduct', async (req, res) => {
          const query ={}
          const result = await productsCollection.find(query).toArray()
          res.send(result)

        app.delete('/addproduct/:id', async(req, res) => {
          const id = req.params.id
          const filter = {_id:ObjectId(id)}
          const result = await productsCollection.deleteOne(filter)
          res.send(result)
        })
  
        })
        app.post('/addproduct', async (req, res) => {
          const addProduct = req.body;
          const result = await productsCollection.insertOne(addProduct)
          res.send(result)
        })

        app.get('/users', async(req, res) => {
          const query = {};
          const users = await usersCollection.find(query).toArray()
          res.send(users)
        })
        app.get('/seller', async(req, res) => {
          const query = {role:'Seller'};
          const users = await usersCollection.find(query).toArray()
          res.send(users)
        })

        app.delete('/seller/:id', async(req, res) => {
          const id = req.params.id
          const filter = {_id:ObjectId(id)}
          const result = await usersCollection.deleteOne(filter)
          res.send(result)
        })


        app.put("/seller/verify/:id",verifyJWT, async(req, res)=>{
          const decodedEmail = req.decoded.email;
          const query = {email: decodedEmail};
          const user = await usersCollection.findOne(query);
          if(user?.role !== 'admin'){
            return res.status(403).send({message: 'forbidden access'})
          }
          const id = req.params.id;
          const filter = {_id : ObjectId(id)};
          const option = {upsert: true};
          const updatedDoc = {
            $set:{
              isVerify : true
            }
          }
          const result = await usersCollection.updateOne(filter, updatedDoc, option);
          res.send(result);
        })

        app.get('/buyer', async(req, res) => {
          const query = {role:'Buyer'};
          const users = await usersCollection.find(query).toArray()
          res.send(users)
        })

        app.delete('/buyer/:id', async(req, res) => {
          const id = req.params.id
          const filter = {_id:ObjectId(id)}
          const result = await usersCollection.deleteOne(filter)
          res.send(result)
        })


        app.get('/users/admin/:email', async (req, res) => {
          const email = req.params.email;
          const query = {email}
          const user = await usersCollection.findOne(query);
          res.send({isAdmin: user?.role === 'admin'})
        })

        app.get('/users/seller/:email', async (req, res) => {
          const email = req.params.email;
          const query = {email}
          const user = await usersCollection.findOne(query);
          res.send({isSeller: user?.role === 'Seller'})
        })


        app.post('/users' , async(req, res) => {
          const user = req.body;
          const result = await usersCollection.insertOne(user);
          res.send(result)
        })

        app.put('/users/admin/:id', verifyJWT, async(req, res) => {
          const decodedEmail = req.decoded.email;
          console.log(decodedEmail);
          const query = {email : decodedEmail};
          const user = await usersCollection.findOne(query)
          if(user?.role !== 'admin'){
            return res.status(403).send({message: 'forbidden access'})
          }
          const id  = req.params.id;
          const filter = {_id: ObjectId(id)}
          const options = {upsert : true}
          const updatedDoc = {
            $set: {
              role: 'admin'
            }
          }
          const result = await usersCollection.updateOne(filter, updatedDoc, options)
          res.send(result)
        })

        app.post('/create-payment-intent', async (req, res) => {
            const product = req.body;
            const price = product.price;
            const amount = parseInt(price) * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
          });

        //get product from advertise
          app.get("/reportedProducts", async(req, res)=>{
            const query = {isReported: true};
            const result = await productsCollection.find(query).toArray();
            res.send(result);
          })
        
          app.put("/reportedProducts/:id", async(req, res)=>{
            const id = req.params.id;
            const filter ={_id: ObjectId(id)};
            const option = {upsert: true};
            const updatedDoc = {
              $set:{
                isReported: true
              }
            }
            const result = await productsCollection.updateOne(filter, updatedDoc, option);
            res.send(result);
          })

        app.get('/jwt', async (req, res) => {
          const email = req.query.email;
          const query = {email : email}
          const user = await usersCollection.findOne(query)
          if(user) {
            const token = jwt.sign({email}, process.env.ACCESS_TOKEN, {expiresIn: '1d'})
            return res.send({accessToken: token})
          }
          res.status(403).send({accessToken: ''})
        })
      }
    finally{

    }
}
run().catch(err => console.error(err))

app.get('/', (req, res) => {
  res.send('Server is running...')
})

app.listen(port, () => {
  console.log(`Server is running...on ${port}`)
})