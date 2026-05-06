// This file is clean — no secrets
const appName = "MyApp";
const version = "1.0.0";
const port = 3000;

function greet(name) {
  return `Hello, ${name}!`;
}

module.exports = { appName, version, port, greet };
