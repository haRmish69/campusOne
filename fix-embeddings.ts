import { PrismaClient } from "@prisma/client";
import { embedText } from "./lib/embeddings";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();

async function fixEmbeddings() {
  const classes = await prisma.classSchedule.findMany();
  let updated = 0;
  for (const cls of classes) {
    const embedString = `class schedule timetable ${cls.subject || "Class"} taught by ${cls.faculty || "Unknown"} on ${cls.day || "Unknown"} from ${cls.startTime || "00:00"} to ${cls.endTime || "00:00"} at ${cls.room || "Unknown"}`;
    const embedding = await embedText(embedString);
    await prisma.classSchedule.update({
      where: { id: cls.id },
      data: { embedding }
    });
    updated++;
  }
  console.log(`Updated embeddings for ${updated} classes.`);
}

fixEmbeddings();
