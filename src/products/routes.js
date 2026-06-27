const { Router } = require("express");
const { getProducts } = require("./service");
const { parseQueryParams } = require("./validation");

const router = Router();

router.get("/", async (req, res) => {
  try {
    const params = parseQueryParams(req.query);
    const result = await getProducts(params);
    res.json(result);
  } catch (err) {
    console.error("Failed to fetch products:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
