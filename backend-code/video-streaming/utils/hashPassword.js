const crypto = require("crypto");


const hashPassword = (password) => {
  const hash = crypto.createHash("sha3-256");
  hash.update(password);
  return hash.digest("hex");
};

module.exports = hashPassword;
