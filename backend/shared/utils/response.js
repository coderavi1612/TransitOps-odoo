function success(res, data, statusCode = 200) {
  return res.status(statusCode).json(data);
}

function error(res, message, statusCode = 400, detail = null) {
  const payload = { error: message };
  if (detail) {
    payload.detail = detail;
  }
  return res.status(statusCode).json(payload);
}

module.exports = { success, error };
