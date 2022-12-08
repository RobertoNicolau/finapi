const express = require("express");
const { v4: uuid } = require("uuid");

const app = express();
app.use(express.json());

const customers = [];

//Middleware

function verifyIfAccountExists(req, res, next) {
  const { cpf } = req.headers;
  const customer = customers.find((customer) => customer.cpf === cpf);
  if (!customer) {
    return res.status(400).json({ error: "customer not found" });
  }
  req.customer = customer;
  return next();
}

function getBalance(statement) {
  const balance = statement.reduce((acc, operation) => {
    if (operation.type === "credit") {
      return acc + operation.amount;
    } else {
      return acc - operation.amount;
    }
  }, 0);

  return balance;
}
//List Account Data
app.get("/account", verifyIfAccountExists, (req, res) => {
  const { customer } = req;
  return res.json(customer);
});

//Create Account
app.post("/account", (req, res) => {
  const { cpf, name } = req.body;
  const customerExists = customers.some((customer) => customer.cpf === cpf);

  if (customerExists) {
    return res.status(400).json({ error: "customer already exists!" });
  }

  customers.push({
    cpf,
    name,
    id: uuid(),
    statement: [],
  });
  return res.status(201).send();
});

//Update Account
app.put("/account", verifyIfAccountExists, (req, res) => {
  const { name } = req.body;
  const { customer } = req;

  customer.name = name;
  return res.status(201).send({ message: "customer updated" });
});

//Delete Account
app.delete("/account", verifyIfAccountExists, (req, res) => {
  const { customer } = req;

  customers.splice(customer, 1);
  return res.status(204).send({ message: "Account removed" });
});
//List Statements
app.get("/statement", verifyIfAccountExists, (req, res) => {
  const { customer } = req;
  return res.json(customer.statement);
});

//List Statements by date
app.get("/statement/date", verifyIfAccountExists, (req, res) => {
  const { date } = req.query;
  const { customer } = req;

  const dateFormat = new Date(date + " 00:00");

  const statement = customer.statement.filter(
    (statement) =>
      statement.created_at.toDateString() ===
      new Date(dateFormat).toDateString()
  );

  return res.json(statement);
});

//Create a deposit
app.post("/deposit", verifyIfAccountExists, (req, res) => {
  const { description, amount } = req.body;
  const { customer } = req;

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: "credit",
  };

  customer.statement.push(statementOperation);

  return res.status(201).send({ message: "Inserido com sucesso" });
});

//Create a withdraw
app.post("/withdraw", verifyIfAccountExists, (req, res) => {
  const { amount } = req.body;
  const { customer } = req;
  const balance = getBalance(customer.statement);
  if (balance < amount) {
    return res.status(400).json({ error: "Insuficient funds" });
  }

  const statementOperation = {
    description: "Withdraw",
    amount,
    created_at: new Date(),
    type: "debit",
  };

  customer.statement.push(statementOperation);

  return res.status(201).send({ message: "Saque realizado com sucesso" });
});

app.get("/balance", verifyIfAccountExists, (req, res) => {
  const { customer } = req;
  const balance = getBalance(customer.statement);

  return res.status(200).json(balance);
});

app.listen(3030);
