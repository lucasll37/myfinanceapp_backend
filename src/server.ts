import app from "@/app";
import dotenv from "dotenv";

dotenv.config();

const PORT = Number(process.env.PORT);

app.listen(PORT, "0.0.0.0", (): void => {
  console.log(`\nServidor rodando em http://0.0.0.0:${PORT}`);
});