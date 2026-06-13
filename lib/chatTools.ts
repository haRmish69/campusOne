import { prisma } from "./prisma";
import { getRealEmbedding } from "./embeddings";
import { addToFaissIndex } from "./vectorStore";
import { IndexFlatL2 } from "faiss-node";
import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const INDEX_PATH = path.join(DATA_DIR, "campus.index");
const MAP_PATH = path.join(DATA_DIR, "faiss_map.json");

/**
 * Remove a Prisma ID from the FAISS map (marks it as deleted).
 * Since FAISS IndexFlatL2 doesn't support true deletion, we remove the mapping
 * so the vector is never returned in search results.
 */
function removeFaissMapping(prismaId: string) {
  if (!fs.existsSync(MAP_PATH)) return;
  const faissMap: Record<string, string> = JSON.parse(fs.readFileSync(MAP_PATH, "utf-8"));
  for (const [key, val] of Object.entries(faissMap)) {
    if (val === prismaId) {
      delete faissMap[key];
    }
  }
  fs.writeFileSync(MAP_PATH, JSON.stringify(faissMap, null, 2));
}

// ─── Gemini Function Declarations ────────────────────────────────────────

export const toolDeclarations = [
  {
    name: "update_mess_menu",
    description: "Update a specific mess menu item. Use this when the user wants to change a food item in the mess menu for a specific day and meal.",
    parameters: {
      type: "object" as const,
      properties: {
        day: { type: "string", description: "Day of the week (e.g. Monday, Tuesday)" },
        meal: { type: "string", description: "Meal type (e.g. Breakfast, Lunch, Evening Snack, Dinner, Second Breakfast, Third Breakfast)" },
        newItems: { type: "string", description: "The updated comma-separated list of food items for this meal" },
      },
      required: ["day", "meal", "newItems"],
    },
  },
  {
    name: "update_notice",
    description: "Update an existing notice's title or body content. Use this when the user wants to edit a notice.",
    parameters: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "The current title of the notice to find it" },
        newTitle: { type: "string", description: "New title (optional, keep the same if not changing)" },
        newBody: { type: "string", description: "New body content (optional, keep the same if not changing)" },
      },
      required: ["title"],
    },
  },
  {
    name: "update_deadline",
    description: "Update an existing deadline's details. Use this when the user wants to change a deadline's due date, title, or notes.",
    parameters: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "The current title of the deadline to find it" },
        newTitle: { type: "string", description: "New title (optional)" },
        newDueDate: { type: "string", description: "New due date in ISO-8601 format (optional)" },
        newNotes: { type: "string", description: "New notes (optional)" },
      },
      required: ["title"],
    },
  },
  {
    name: "update_schedule",
    description: "Update a class schedule entry. Use this when the user wants to change a class time, room, or day.",
    parameters: {
      type: "object" as const,
      properties: {
        subject: { type: "string", description: "The subject name or code to find the class" },
        day: { type: "string", description: "Current day of the class (to identify which entry)" },
        newDay: { type: "string", description: "New day (optional)" },
        newStartTime: { type: "string", description: "New start time in HH:MM 24h format (optional)" },
        newEndTime: { type: "string", description: "New end time in HH:MM 24h format (optional)" },
        newRoom: { type: "string", description: "New room/location (optional)" },
      },
      required: ["subject"],
    },
  },
  {
    name: "add_notice",
    description: "Add a new notice to the system. Use this when the user wants to create a new notice or announcement.",
    parameters: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Title of the notice" },
        body: { type: "string", description: "Full body content of the notice" },
        category: { type: "string", description: "Category: placement, exam, event, hostel, or general" },
      },
      required: ["title", "body"],
    },
  },
  {
    name: "add_deadline",
    description: "Add a new deadline or assignment. Use this when the user mentions a new upcoming deadline.",
    parameters: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Title of the deadline" },
        subject: { type: "string", description: "Subject or course name" },
        dueDate: { type: "string", description: "Due date in ISO-8601 format" },
        notes: { type: "string", description: "Additional notes (optional)" },
      },
      required: ["title", "subject", "dueDate"],
    },
  },
  {
    name: "add_schedule",
    description: "Add a new class to the schedule. Use this when the user mentions a new class time.",
    parameters: {
      type: "object" as const,
      properties: {
        subject: { type: "string", description: "Subject or course name" },
        day: { type: "string", description: "Day of the week" },
        startTime: { type: "string", description: "Start time in HH:MM 24h format" },
        endTime: { type: "string", description: "End time in HH:MM 24h format" },
        room: { type: "string", description: "Classroom (optional)" },
        faculty: { type: "string", description: "Professor or faculty name (optional)" },
      },
      required: ["subject", "day", "startTime", "endTime"],
    },
  },
  {
    name: "add_expense",
    description: "Log a new financial expense. Use this when the user mentions spending money.",
    parameters: {
      type: "object" as const,
      properties: {
        amount: { type: "number", description: "The amount spent (number only)" },
        category: { type: "string", description: "food, travel, academics, rent, subscriptions, entertainment, or other" },
        description: { type: "string", description: "What the expense was for" },
        date: { type: "string", description: "Date of expense in YYYY-MM-DD format (optional)" },
      },
      required: ["amount", "category", "description"],
    },
  },
  {
    name: "update_expense",
    description: "Update an existing expense. Use this when the user wants to change the amount or details of a logged expense.",
    parameters: {
      type: "object" as const,
      properties: {
        descriptionSearch: { type: "string", description: "Search term to find the existing expense (e.g. 'pizza')" },
        newAmount: { type: "number", description: "New amount (optional)" },
        newCategory: { type: "string", description: "New category (optional)" },
        newDescription: { type: "string", description: "New description (optional)" },
      },
      required: ["descriptionSearch"],
    },
  },
  {
    name: "add_wellness_log",
    description: "Log a new daily wellness entry (mood, stress, sleep). Use this when the user talks about how they feel today.",
    parameters: {
      type: "object" as const,
      properties: {
        mood: { type: "number", description: "Mood score from 1 to 5 (5 is best)" },
        stressLevel: { type: "number", description: "Stress level from 1 to 5 (1 is low stress, 5 is high)" },
        sleepHours: { type: "number", description: "Hours of sleep (optional)" },
        notes: { type: "string", description: "Any notes about their day or feelings (optional)" },
      },
      required: ["mood", "stressLevel"],
    },
  },
  {
    name: "update_wellness_log",
    description: "Update an existing wellness log. Use this when the user wants to change their mood or stress entry.",
    parameters: {
      type: "object" as const,
      properties: {
        dateSearch: { type: "string", description: "Date of the log to update in YYYY-MM-DD format" },
        newMood: { type: "number", description: "New mood score (optional)" },
        newStressLevel: { type: "number", description: "New stress level (optional)" },
        newSleepHours: { type: "number", description: "New sleep hours (optional)" },
        newNotes: { type: "string", description: "New notes (optional)" },
      },
      required: ["dateSearch"],
    },
  },
];

// ─── Executor Functions ──────────────────────────────────────────────────

export async function executeTool(name: string, args: any): Promise<string> {
  switch (name) {
    case "update_mess_menu":
      return updateMessMenu(args);
    case "update_notice":
      return updateNotice(args);
    case "update_deadline":
      return updateDeadline(args);
    case "update_schedule":
      return updateSchedule(args);
    case "add_notice":
      return addNotice(args);
    case "add_deadline":
      return addDeadline(args);
    case "add_schedule":
      return addSchedule(args);
    case "add_expense":
      return addExpense(args);
    case "update_expense":
      return updateExpense(args);
    case "add_wellness_log":
      return addWellnessLog(args);
    case "update_wellness_log":
      return updateWellnessLog(args);
    default:
      return `Unknown tool: ${name}`;
  }
}

async function updateMessMenu(args: { day: string; meal: string; newItems: string }): Promise<string> {
  const { day, meal, newItems } = args;

  // Find the matching menu entry (case-insensitive match)
  const existing = await prisma.messMenu.findFirst({
    where: {
      day: { contains: day },
      meal: { contains: meal },
    },
  });

  if (!existing) {
    return `Could not find a mess menu entry for ${day} ${meal}. Available days: Monday-Sunday. Available meals: Breakfast, Second Breakfast, Third Breakfast, Lunch, Evening Snack, Dinner.`;
  }

  // Update MySQL
  const updated = await prisma.messMenu.update({
    where: { id: existing.id },
    data: { items: newItems },
  });

  // Update FAISS: remove old mapping, add new embedding
  removeFaissMapping(existing.id);
  await addToFaissIndex(updated.id, `[MESS] ${updated.day} ${updated.meal}: ${updated.items}`);

  return `Successfully updated ${day} ${meal} menu. New items: ${newItems}`;
}

async function updateNotice(args: { title: string; newTitle?: string; newBody?: string }): Promise<string> {
  const { title, newTitle, newBody } = args;

  const existing = await prisma.notice.findFirst({
    where: { title: { contains: title } },
  });

  if (!existing) {
    return `Could not find a notice with title containing "${title}".`;
  }

  const updateData: any = {};
  if (newTitle) updateData.title = newTitle;
  if (newBody) updateData.body = newBody;

  const updated = await prisma.notice.update({
    where: { id: existing.id },
    data: updateData,
  });

  // Update FAISS
  removeFaissMapping(existing.id);
  await addToFaissIndex(updated.id, `[NOTICE] ${updated.title}: ${updated.body}`);

  return `Successfully updated notice "${updated.title}".`;
}

async function updateDeadline(args: { title: string; newTitle?: string; newDueDate?: string; newNotes?: string }): Promise<string> {
  const { title, newTitle, newDueDate, newNotes } = args;

  const existing = await prisma.deadline.findFirst({
    where: { title: { contains: title } },
  });

  if (!existing) {
    return `Could not find a deadline with title containing "${title}".`;
  }

  const updateData: any = {};
  if (newTitle) updateData.title = newTitle;
  if (newDueDate) updateData.dueDate = new Date(newDueDate);
  if (newNotes) updateData.notes = newNotes;

  const updated = await prisma.deadline.update({
    where: { id: existing.id },
    data: updateData,
  });

  removeFaissMapping(existing.id);
  await addToFaissIndex(updated.id, `[DEADLINE] ${updated.title} (${updated.subject}) due ${updated.dueDate}. ${updated.notes || ""}`);

  return `Successfully updated deadline "${updated.title}". New due date: ${updated.dueDate}.`;
}

async function updateSchedule(args: { subject: string; day?: string; newDay?: string; newStartTime?: string; newEndTime?: string; newRoom?: string }): Promise<string> {
  const { subject, day, newDay, newStartTime, newEndTime, newRoom } = args;

  const where: any = { subject: { contains: subject } };
  if (day) where.day = { contains: day };

  const existing = await prisma.classSchedule.findFirst({ where });

  if (!existing) {
    return `Could not find a class schedule for "${subject}"${day ? ` on ${day}` : ""}.`;
  }

  const updateData: any = {};
  if (newDay) updateData.day = newDay;
  if (newStartTime) updateData.startTime = newStartTime;
  if (newEndTime) updateData.endTime = newEndTime;
  if (newRoom) updateData.room = newRoom;

  const updated = await prisma.classSchedule.update({
    where: { id: existing.id },
    data: updateData,
  });

  removeFaissMapping(existing.id);
  await addToFaissIndex(updated.id, `[CLASS] ${updated.subject} taught by ${updated.faculty || "Unknown"} on ${updated.day} from ${updated.startTime} to ${updated.endTime} at ${updated.room || "Unknown"}`);

  return `Successfully updated class "${updated.subject}" on ${updated.day}. Time: ${updated.startTime}-${updated.endTime}, Room: ${updated.room}.`;
}

async function addNotice(args: { title: string; body: string; category?: string }): Promise<string> {
  const { title, body, category } = args;
  const validCategories = ["placement", "exam", "event", "hostel", "general"];
  const safeCategory = validCategories.includes(category?.toLowerCase() || "") ? category!.toLowerCase() : "general";

  const embedding = await getRealEmbedding(`[NOTICE] ${title}: ${body}`);

  const notice = await prisma.notice.create({
    data: {
      title,
      body,
      category: safeCategory,
      embedding,
    },
  });

  await addToFaissIndex(notice.id, `[NOTICE] ${title}: ${body}`);

  return `Successfully created new notice: "${title}" in category "${safeCategory}".`;
}

async function addDeadline(args: { title: string; subject: string; dueDate: string; notes?: string }): Promise<string> {
  const { title, subject, dueDate, notes } = args;

  const parsedDate = new Date(dueDate);
  if (isNaN(parsedDate.getTime())) {
    return `Invalid due date: "${dueDate}". Please provide a valid date.`;
  }

  const embedding = await getRealEmbedding(`[DEADLINE] ${title} (${subject}) due ${dueDate}. ${notes || ""}`);

  const deadline = await prisma.deadline.create({
    data: {
      title,
      subject,
      dueDate: parsedDate,
      type: "other",
      notes: notes || null,
      embedding,
    },
  });

  await addToFaissIndex(deadline.id, `[DEADLINE] ${title} (${subject}) due ${dueDate}. ${notes || ""}`);

  return `Successfully created new deadline: "${title}" for ${subject}, due ${parsedDate.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}.`;
}

async function addSchedule(args: { subject: string; day: string; startTime: string; endTime: string; room?: string; faculty?: string }): Promise<string> {
  const { subject, day, startTime, endTime, room, faculty } = args;

  const embedding = await getRealEmbedding(`[CLASS] ${subject} taught by ${faculty || "Unknown"} on ${day} from ${startTime} to ${endTime} at ${room || "Unknown"}`);

  const schedule = await prisma.classSchedule.create({
    data: {
      subject,
      day,
      startTime,
      endTime,
      room,
      faculty,
      embedding,
    },
  });

  await addToFaissIndex(schedule.id, `[CLASS] ${subject} taught by ${faculty || "Unknown"} on ${day} from ${startTime} to ${endTime} at ${room || "Unknown"}`);

  return `Successfully added class "${subject}" on ${day} from ${startTime} to ${endTime}.`;
}

async function addExpense(args: { amount: number; category: string; description: string; date?: string }): Promise<string> {
  const { amount, category, description, date } = args;

  const validCategories = ["food", "travel", "academics", "rent", "subscriptions", "entertainment", "other"];
  const safeCategory = validCategories.includes(category.toLowerCase()) ? category.toLowerCase() : "other";

  const expenseDate = date ? new Date(date) : new Date();

  const embedding = await getRealEmbedding(`[EXPENSE] ${safeCategory}: ₹${amount} on ${description} (${expenseDate.toISOString().split("T")[0]})`);

  const expense = await prisma.expense.create({
    data: {
      amount,
      category: safeCategory,
      description,
      date: expenseDate,
      source: "manual",
      embedding,
    },
  });

  await addToFaissIndex(expense.id, `[EXPENSE] ${safeCategory}: ₹${amount} on ${description} (${expenseDate.toISOString().split("T")[0]})`);

  return `Successfully logged expense: ₹${amount} for ${description} under ${safeCategory}.`;
}

async function updateExpense(args: { descriptionSearch: string; newAmount?: number; newCategory?: string; newDescription?: string }): Promise<string> {
  const { descriptionSearch, newAmount, newCategory, newDescription } = args;

  const existing = await prisma.expense.findFirst({
    where: { description: { contains: descriptionSearch } },
    orderBy: { date: 'desc' },
  });

  if (!existing) {
    return `Could not find an expense matching description "${descriptionSearch}".`;
  }

  const updateData: any = {};
  if (newAmount !== undefined) updateData.amount = newAmount;
  if (newCategory) updateData.category = newCategory;
  if (newDescription) updateData.description = newDescription;

  const updated = await prisma.expense.update({
    where: { id: existing.id },
    data: updateData,
  });

  removeFaissMapping(existing.id);
  await addToFaissIndex(updated.id, `[EXPENSE] ${updated.category}: ₹${updated.amount} on ${updated.description} (${updated.date.toISOString().split("T")[0]})`);

  return `Successfully updated expense. Amount is now ₹${updated.amount} for "${updated.description}".`;
}

async function addWellnessLog(args: { mood: number; stressLevel: number; sleepHours?: number; notes?: string }): Promise<string> {
  const { mood, stressLevel, sleepHours, notes } = args;
  
  const today = new Date();
  // Strip time for uniqueness checking
  const startOfDay = new Date(today);
  startOfDay.setHours(0,0,0,0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23,59,59,999);

  // Check if one exists for today already
  const existing = await prisma.wellnessLog.findFirst({
    where: {
      date: { gte: startOfDay, lte: endOfDay }
    }
  });

  if (existing) {
    return await updateWellnessLog({ 
      dateSearch: today.toISOString().split("T")[0],
      newMood: mood,
      newStressLevel: stressLevel,
      newSleepHours: sleepHours,
      newNotes: notes
    });
  }

  const embedding = await getRealEmbedding(`[WELLNESS] Mood: ${mood}/5, Stress: ${stressLevel}/5, Sleep: ${sleepHours || 0}h. Notes: ${notes || ""}. Date: ${today.toISOString().split("T")[0]}`);

  const log = await prisma.wellnessLog.create({
    data: {
      mood,
      stressLevel,
      sleepHours,
      notes,
      embedding,
    },
  });

  await addToFaissIndex(log.id, `[WELLNESS] Mood: ${mood}/5, Stress: ${stressLevel}/5, Sleep: ${sleepHours || 0}h. Notes: ${notes || ""}. Date: ${today.toISOString().split("T")[0]}`);

  return `Successfully logged today's wellness. Mood: ${mood}/5, Stress: ${stressLevel}/5.`;
}

async function updateWellnessLog(args: { dateSearch: string; newMood?: number; newStressLevel?: number; newSleepHours?: number; newNotes?: string }): Promise<string> {
  const { dateSearch, newMood, newStressLevel, newSleepHours, newNotes } = args;

  const searchDate = new Date(dateSearch);
  searchDate.setHours(0,0,0,0);
  const nextDay = new Date(searchDate);
  nextDay.setDate(searchDate.getDate() + 1);

  const existing = await prisma.wellnessLog.findFirst({
    where: {
      date: {
        gte: searchDate,
        lt: nextDay,
      }
    },
    orderBy: { date: 'desc' }
  });

  if (!existing) {
    return `Could not find a wellness log to update.`;
  }

  const updateData: any = {};
  if (newMood !== undefined) updateData.mood = newMood;
  if (newStressLevel !== undefined) updateData.stressLevel = newStressLevel;
  if (newSleepHours !== undefined) updateData.sleepHours = newSleepHours;
  if (newNotes !== undefined) updateData.notes = newNotes;

  const updated = await prisma.wellnessLog.update({
    where: { id: existing.id },
    data: updateData,
  });

  removeFaissMapping(existing.id);
  await addToFaissIndex(updated.id, `[WELLNESS] Mood: ${updated.mood}/5, Stress: ${updated.stressLevel}/5, Sleep: ${updated.sleepHours || 0}h. Notes: ${updated.notes || ""}. Date: ${updated.date.toISOString().split("T")[0]}`);

  return `Successfully updated wellness log for ${updated.date.toISOString().split("T")[0]}. Mood is now ${updated.mood}/5.`;
}
