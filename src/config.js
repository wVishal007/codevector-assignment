require("dotenv").config();

module.exports = {
  port: parseInt(process.env.PORT || "10000", 10),
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/products",
  defaultLimit: 50,
  maxLimit: 100,
  seedApiKey: process.env.SEED_API_KEY || "",
};
