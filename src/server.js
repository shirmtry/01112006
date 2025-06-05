import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import userApi from "./src/pages/api/user.js";
import betsApi from "./src/pages/api/bets.js";
import requestsApi from "./src/pages/api/requests.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.all("/api/user", userApi);
app.all("/api/bets", betsApi);
app.all("/api/requests", requestsApi);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
