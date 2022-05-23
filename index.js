const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
  res.send("initial success");
});
app.listen(port, () => {
  console.log("connected to", port);
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2nttd.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

//JWT verify
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();
    const toolsCollection = client.db("power-tools").collection("tools");
    const ordersCollection = client.db("power-tools").collection("orders");
    const reviewsCollection = client.db("power-tools").collection("reviews");
    const usersCollection = client.db("power-tools").collection("users");

    // verify admin
    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await usersCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "forbidden" });
      }
    };

    //load Tools
    app.get("/tools", async (req, res) => {
      const query = {};
      const cursor = toolsCollection.find(query);
      const tools = await cursor.toArray();
      res.send(tools);
    });

    //Tool Detail
    app.get("/tools/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const tool = await toolsCollection.findOne(query);
      res.send(tool);
    });

    //Update available
    app.put("/tools/:id", async (req, res) => {
      const id = req.params.id;
      const newTool = req.body;

      const query = { _id: ObjectId(id) };
      updatedQuantity = { $set: { available: newTool.available } };
      const options = { upsert: true };
      const result = await toolsCollection.updateOne(
        query,
        updatedQuantity,
        options
      );
      res.send(result);
    });

    //add order
    app.post("/orders", async (req, res) => {
      const order = req.body;
      const result = await ordersCollection.insertOne(order);
      res.send(result);
    });

    //get order
    app.get("/orders", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email === decodedEmail) {
        const query = { email: email };
        const orders = await ordersCollection.find(query).toArray();

        res.send(orders);
      } else {
        return res.status(403).send({ message: "forbidden access" });
      }
    });

    //add review
    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await reviewsCollection.insertOne(review);
      res.send(result);
    });

    // get all reviews
    app.get("/reviews", async (req, res) => {
      const query = {};
      const reviews = await reviewsCollection.find(query).toArray();

      res.send(reviews);
    });

    //get user review
    app.get("/userReviews", async (req, res) => {
      const email = req.query.email;

      const query = { email: email };
      const reviews = await reviewsCollection.find(query).toArray();

      res.send(reviews);
    });

    // Add or update profile
    app.put("/users", async (req, res) => {
      const email = req.query.email;
      const newProfile = req.body;

      const query = { email: email };

      const options = { upsert: true };

      updatedProfile = {
        $set: {
          email: newProfile?.email,
          location: newProfile?.location,
          phone: newProfile?.phone,
          education: newProfile?.education,
          linkedIn: newProfile?.linkedIn,
        },
      };

      const result = await usersCollection.updateOne(
        query,
        updatedProfile,
        options
      );
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );
      res.send({ result, token });
    });

    //get user
    app.get("/users", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email === decodedEmail) {
        const query = { email: email };

        const user = await usersCollection.find(query).toArray();
        res.send(user);
      } else {
        return res.status(403).send({ message: "forbidden access" });
      }
    });

    //get all user
    app.get("/user", async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    });

    //add admin
    app.put("/user/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // get admin
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });

    console.log("connected to mongoDB");
  } finally {
  }
}
run().catch(console.dir);
