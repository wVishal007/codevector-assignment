const mongoose = require("mongoose");
const config = require("./config");
const Product = require("./models/Product");

const CATEGORIES = [
  "Electronics", "Clothing", "Home & Kitchen", "Books",
  "Sports", "Beauty", "Toys", "Automotive", "Music", "Garden",
];

const TOTAL_PRODUCTS = 200_000;
const BATCH_SIZE = 1_000;

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPrice() {
  return parseFloat((Math.random() * 1000).toFixed(2));
}

function randomDate() {
  const now = Date.now();
  const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
  return new Date(oneYearAgo + Math.random() * (now - oneYearAgo));
}

function createBatch(startIndex, count) {
  const batch = [];
  for (let i = 0; i < count; i++) {
    const num = startIndex + i + 1;
    const created_at = randomDate();
    batch.push({
      name: `Product ${num}`,
      category: randomElement(CATEGORIES),
      price: randomPrice(),
      created_at,
      updated_at: new Date(
        created_at.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000
      ),
    });
  }
  return batch;
}

async function runSeed() {
  console.log("Dropping existing products...");
  await Product.deleteMany({});

  console.log(`Seeding ${TOTAL_PRODUCTS.toLocaleString()} products...`);
  const startTime = Date.now();

  for (let batchNum = 0; batchNum < TOTAL_PRODUCTS / BATCH_SIZE; batchNum++) {
    const batch = createBatch(batchNum * BATCH_SIZE, BATCH_SIZE);
    await Product.insertMany(batch, { ordered: false });
    const inserted = (batchNum + 1) * BATCH_SIZE;
    if ((batchNum + 1) % 20 === 0 || inserted === TOTAL_PRODUCTS) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  Inserted ${inserted.toLocaleString()} / ${TOTAL_PRODUCTS.toLocaleString()} (${elapsed}s)`);
    }
  }

  console.log("Ensuring indexes...");
  await Product.createIndexes();

  const totalTime = (Date.now() - startTime) / 1000;
  const docCount = await Product.countDocuments();
  console.log(`Done! ${docCount.toLocaleString()} products in ${totalTime.toFixed(1)}s`);

  return { count: docCount, timeSeconds: totalTime };
}

if (require.main === module) {
  (async () => {
    try {
      await mongoose.connect(config.mongodbUri);
      await runSeed();
      await mongoose.disconnect();
    } catch (err) {
      console.error("Seed failed:", err);
      process.exit(1);
    }
  })();
}

module.exports = { runSeed };
