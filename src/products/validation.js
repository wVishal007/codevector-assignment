const config = require("../config");

function parseQueryParams(query) {
  const limit = Math.max(1, Math.min(config.maxLimit,
    parseInt(query.limit || config.defaultLimit, 10)));
  const category = query.category || undefined;
  return { cursor: query.cursor, limit, category };
}

function decodeCursor(encoded) {
  if (!encoded) return null;
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf-8");
    const payload = JSON.parse(json);
    if (!payload.created_at || !payload._id) return null;
    if (!payload._id.match(/^[0-9a-fA-F]{24}$/)) return null;
    return payload;
  } catch {
    return null;
  }
}

function encodeCursor(created_at, _id) {
  const payload = {
    created_at: created_at.toISOString(),
    _id: _id.toString(),
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

module.exports = { parseQueryParams, decodeCursor, encodeCursor };
