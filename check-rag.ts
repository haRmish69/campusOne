import { PrismaClient } from "@prisma/client";
import { embedText, cosineSimilarity } from "./lib/embeddings";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();

async function checkRAG(query: string) {
  const queryVector = await embedText(query);
  
  const classes = await prisma.classSchedule.findMany();
  console.log(`Found ${classes.length} classes in DB.`);
  
  const parseEmbedding = (raw: any): number[] => {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") return JSON.parse(raw);
    return [];
  };

  const results = classes.map(cls => {
    try {
      const embedding = parseEmbedding(cls.embedding);
      return {
        subject: cls.subject,
        similarity: cosineSimilarity(queryVector, embedding)
      };
    } catch (e) {
      return { subject: cls.subject, similarity: 0 };
    }
  });

  results.sort((a, b) => b.similarity - a.similarity);
  console.log("Top matches for query:", query);
  results.slice(0, 5).forEach(r => console.log(r));
}

checkRAG("What is my schedule?");
