const mongoose = require("mongoose");
const config = require("./config");

async function connect() {
  await mongoose.connect(config.mongodbUri);
  console.log("Connected to MongoDB (Mongoose)");
}

async function disconnect() {
  await mongoose.disconnect();
  console.log("Disconnected from MongoDB");
}

module.exports = { connect, disconnect };
