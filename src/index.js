const express = require("express");
const cors = require("cors");
const path = require("path");
const config = require("./config");
const { connect, disconnect } = require("./db");
const Product = require("./models/Product");
const { runSeed } = require("./seed");
const productRoutes = require("./products/routes");

async function main() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "..", "public")));

  app.use("/api/products", productRoutes);

  app.get("/api/categories", async (_req, res) => {
    try {
      const categories = await Product.distinct("category");
      res.json(categories.sort());
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/seed", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${config.seedApiKey}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const result = await runSeed();
      res.json(result);
    } catch (err) {
      console.error("Seed via API failed:", err);
      res.status(500).json({ error: "Seed failed" });
    }
  });

  await connect();

  const server = app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
  });

  const shutdown = async () => {
    console.log("Shutting down...");
    server.close();
    await disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
