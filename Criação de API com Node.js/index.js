import express from "express";

const app = express();
app.use(express.json());

let users = [
  { id: 1, nome: "ERIK" },
  { id: 2, nome: "DEBORA" },
  { id: 3, nome: "EIKE" },
  { id: 4, nome: "JULIA" }
];

// GET all users
app.get("/users", (req, res) => {
  res.json(users);
});

const port = process.env.PORT ?? 3000;
app.listen(port, () => {
  console.log(`API rodando na porta ${port}`);
});