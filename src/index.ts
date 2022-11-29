import express from "express";
import contractRouter from "./routes/contract";
import { verifyToken } from "./middleware/token";
import { config } from "dotenv";
import handleError from "./middleware/error";

config();

// SETUP
const app = express();
const port = 3000;

// MIDDLEWARES
app.use(express.json());
app.use(verifyToken); // Verify bearer token for all routes
app.use(handleError); // Handle all errors through error middleware

// ROUTES
app.use("/contract", contractRouter);

// START SERVER
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
