const Product = require("../models/Product");
const { decodeCursor, encodeCursor } = require("./validation");

async function getProducts(params) {
  const cursor = decodeCursor(params.cursor);
  const filter = {};

  if (params.category) {
    filter.category = params.category;
  }

  if (cursor) {
    filter.$or = [
      { created_at: { $lt: new Date(cursor.created_at) } },
      {
        created_at: new Date(cursor.created_at),
        _id: { $lt: cursor._id },
      },
    ];
  }

  const docs = await Product
    .find(filter)
    .sort({ created_at: -1, _id: -1 })
    .limit(params.limit + 1)
    .lean();

  const hasMore = docs.length > params.limit;
  if (hasMore) docs.pop();

  const data = docs.map((d) => ({
    _id: d._id.toString(),
    name: d.name,
    category: d.category,
    price: d.price,
    created_at: d.created_at.toISOString(),
    updated_at: d.updated_at.toISOString(),
  }));

  const nextCursor =
    docs.length > 0
      ? encodeCursor(docs[docs.length - 1].created_at, docs[docs.length - 1]._id)
      : null;

  return { data, nextCursor, hasMore };
}

module.exports = { getProducts };
