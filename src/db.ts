import { PrismaClient } from "./generated/prisma/client.js";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function getUserById() {
    const users = await prisma.user.findMany({});
    console.log(users)
}

getUserById();