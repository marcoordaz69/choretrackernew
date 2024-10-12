const jwt = require('jsonwebtoken');
const uuid = require('uuid');
const fs = require('fs');

function generateJWT(applicationId, privateKeyPath) {
  // Read the private key
  const privateKey = fs.readFileSync(privateKeyPath);

  const payload = {
    application_id: applicationId,
    iat: Math.floor(Date.now() / 1000),
    jti: uuid.v4(),
    exp: Math.floor(Date.now() / 1000) + 86400 // Token expires in 24 hours
  };

  const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
  return token;
}

// Usage
const applicationId = 'your_application_id';
const privateKeyPath = 'path/to/your/private_key.pem';

const jwtToken = generateJWT(applicationId, privateKeyPath);
console.log(jwtToken);

module.exports = { generateJWT };