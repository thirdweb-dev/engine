import express from "express";
import contractRouter from "./routes/contract";
import { verifyToken } from "./middlewares/bearer";
import { config } from "dotenv";

config();

// SETUP
const app = express();
const port = 3000;

// MIDDLEWARES
app.use(express.json());
app.use(verifyToken);

// ROUTES
app.use("/contract", contractRouter);

// START SERVER
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
