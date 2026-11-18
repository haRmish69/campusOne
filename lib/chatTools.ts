import { prisma } from "./prisma";
import { getRealEmbedding } from "./embeddings";
import { addToIndex, removeFromIndex } from "./vectorStore";
import { runEmailSync, SyncResult } from "./emailSync";


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
  {
    name: "import_recent_emails",
    description: "Triggers an email sync to fetch the latest campus notices, deadlines, and schedule changes from the user's Gmail inbox. Use this when the user asks to import emails, sync their inbox, check for new email notices, or update from email.",
    parameters: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "extract_smart_notice",
    description: "Extract and store a structured college notice from text or document. Extracts title, category, event date, venue, and required action.",
    parameters: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Official notice or circular title" },
        body: { type: "string", description: "Full or summarized notice body" },
        category: { type: "string", description: "placement, exam, event, hostel, or general" },
        eventDate: { type: "string", description: "Date of event/deadline in YYYY-MM-DD or ISO-8601 format if applicable (optional)" },
        venue: { type: "string", description: "Venue, hall, lab, or platform link (optional)" },
        actionRequired: { type: "string", description: "Clear single-sentence action the student must take (optional)" },
      },
      required: ["title", "body"],
    },
  },
  {
    name: "batch_extract_deadlines",
    description: "Extract and save multiple assignments, lab submissions, or exam deadlines at once from a syllabus or document.",
    parameters: {
      type: "object" as const,
      properties: {
        deadlines: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Assignment or exam title" },
              subject: { type: "string", description: "Subject or course name" },
              dueDate: { type: "string", description: "Due date in YYYY-MM-DD format" },
              notes: { type: "string", description: "Weightage or instructions (optional)" },
            },
            required: ["title", "subject", "dueDate"],
          },
          description: "List of extracted deadlines to save",
        },
      },
      required: ["deadlines"],
    },
  },
  {
    name: "save_college_document",
    description: "Save an uploaded college document, lecture notes, or study guide into the student's personal notes library for long-term AI memory.",
    parameters: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Document title" },
        subject: { type: "string", description: "Course or subject (e.g. Operating Systems, DBMS)" },
        content: { type: "string", description: "Key takeaways, notes text, or summary" },
        fileName: { type: "string", description: "Original file name if available (optional)" },
      },
      required: ["title", "subject", "content"],
    },
  },
];

// ─── Executor Functions ──────────────────────────────────────────────────

export async function executeTool(name: string, args: any, userId: string): Promise<string> {
  switch (name) {
    case "update_mess_menu":
      return updateMessMenu(args, userId);
    case "update_notice":
      return updateNotice(args, userId);
    case "update_deadline":
      return updateDeadline(args, userId);
    case "update_schedule":
      return updateSchedule(args, userId);
    case "add_notice":
      return addNotice(args, userId);
    case "add_deadline":
      return addDeadline(args, userId);
    case "add_schedule":
      return addSchedule(args, userId);
    case "add_expense":
      return addExpense(args, userId);
    case "update_expense":
      return updateExpense(args, userId);
    case "add_wellness_log":
      return addWellnessLog(args, userId);
    case "update_wellness_log":
      return updateWellnessLog(args, userId);
    case "import_recent_emails":
      return importRecentEmails(userId);
    case "extract_smart_notice":
      return extractSmartNotice(args, userId);
    case "batch_extract_deadlines":
      return batchExtractDeadlines(args, userId);
    case "save_college_document":
      return saveCollegeDocument(args, userId);
    default:
      return `Unknown tool: ${name}`;
  }
}

async function updateMessMenu(args: { day: string; meal: string; newItems: string }, userId: string): Promise<string> {
  const { day, meal, newItems } = args;

  // Find the matching menu entry (case-insensitive match)
  const existing = await prisma.messMenu.findFirst({
    where: {
      userId,
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

  // Update vector index
  await removeFromIndex(existing.id, userId);
  await addToIndex(updated.id, `[MESS] ${updated.day} ${updated.meal}: ${updated.items}`, "MessMenu", userId, userId ? "private" : "global");

  return `Successfully updated ${day} ${meal} menu. New items: ${newItems}`;
}

async function updateNotice(args: { title: string; newTitle?: string; newBody?: string }, userId: string): Promise<string> {
  const { title, newTitle, newBody } = args;

  const existing = await prisma.notice.findFirst({
    where: { userId, title: { contains: title } },
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

  // Update vector index
  await removeFromIndex(existing.id, userId);
  await addToIndex(updated.id, `[NOTICE] ${updated.title}: ${updated.body}`, "Notice", userId, userId ? "private" : "global");

  return `Successfully updated notice "${updated.title}".`;
}

async function updateDeadline(args: { title: string; newTitle?: string; newDueDate?: string; newNotes?: string }, userId: string): Promise<string> {
  const { title, newTitle, newDueDate, newNotes } = args;

  const existing = await prisma.deadline.findFirst({
    where: { userId, title: { contains: title } },
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

  await removeFromIndex(existing.id, userId);
  await addToIndex(updated.id, `[DEADLINE] ${updated.title} (${updated.subject}) due ${updated.dueDate}. ${updated.notes || ""}`, "Deadline", userId, userId ? "private" : "global");


  return `Successfully updated deadline "${updated.title}". New due date: ${updated.dueDate}.`;
}

async function updateSchedule(args: { subject: string; day?: string; newDay?: string; newStartTime?: string; newEndTime?: string; newRoom?: string }, userId: string): Promise<string> {
  const { subject, day, newDay, newStartTime, newEndTime, newRoom } = args;

  const where: any = { userId, subject: { contains: subject } };
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

  await removeFromIndex(existing.id, userId);
  await addToIndex(updated.id, `[CLASS] ${updated.subject} taught by ${updated.faculty || "Unknown"} on ${updated.day} from ${updated.startTime} to ${updated.endTime} at ${updated.room || "Unknown"}`, "ClassSchedule", userId, userId ? "private" : "global");


  return `Successfully updated class "${updated.subject}" on ${updated.day}. Time: ${updated.startTime}-${updated.endTime}, Room: ${updated.room}.`;
}

async function addNotice(args: { title: string; body: string; category?: string }, userId: string): Promise<string> {
  const { title, body, category } = args;
  const validCategories = ["placement", "exam", "event", "hostel", "general"];
  const safeCategory = validCategories.includes(category?.toLowerCase() || "") ? category!.toLowerCase() : "general";

  const embedding = await getRealEmbedding(`[NOTICE] ${title}: ${body}`);

  const notice = await prisma.notice.create({
    data: {
      userId,
      title,
      body,
      category: safeCategory,
      embedding,
    },
  });

  await addToIndex(notice.id, `[NOTICE] ${title}: ${body}`, "Notice", userId, userId ? "private" : "global");

  return `Successfully created new notice: "${title}" in category "${safeCategory}".`;
}

async function addDeadline(args: { title: string; subject: string; dueDate: string; notes?: string }, userId: string): Promise<string> {
  const { title, subject, dueDate, notes } = args;

  const parsedDate = new Date(dueDate);
  if (isNaN(parsedDate.getTime())) {
    return `Invalid due date: "${dueDate}". Please provide a valid date.`;
  }

  const embedding = await getRealEmbedding(`[DEADLINE] ${title} (${subject}) due ${dueDate}. ${notes || ""}`);

  const deadline = await prisma.deadline.create({
    data: {
      userId,
      title,
      subject,
      dueDate: parsedDate,
      type: "other",
      notes: notes || null,
      embedding,
    },
  });

  await addToIndex(deadline.id, `[DEADLINE] ${title} (${subject}) due ${dueDate}. ${notes || ""}`, "Deadline", userId, userId ? "private" : "global");

  return `Successfully created new deadline: "${title}" for ${subject}, due ${parsedDate.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}.`;
}

async function addSchedule(args: { subject: string; day: string; startTime: string; endTime: string; room?: string; faculty?: string }, userId: string): Promise<string> {
  const { subject, day, startTime, endTime, room, faculty } = args;

  const embedding = await getRealEmbedding(`[CLASS] ${subject} taught by ${faculty || "Unknown"} on ${day} from ${startTime} to ${endTime} at ${room || "Unknown"}`);

  const schedule = await prisma.classSchedule.create({
    data: {
      userId,
      subject,
      day,
      startTime,
      endTime,
      room,
      faculty,
      embedding,
    },
  });

  await addToIndex(schedule.id, `[CLASS] ${subject} taught by ${faculty || "Unknown"} on ${day} from ${startTime} to ${endTime} at ${room || "Unknown"}`, "ClassSchedule", userId, userId ? "private" : "global");

  return `Successfully added class "${subject}" on ${day} from ${startTime} to ${endTime}.`;
}

async function addExpense(args: { amount: number; category: string; description: string; date?: string }, userId: string): Promise<string> {
  const { amount, category, description, date } = args;

  const validCategories = ["food", "travel", "academics", "rent", "subscriptions", "entertainment", "other"];
  const safeCategory = validCategories.includes(category.toLowerCase()) ? category.toLowerCase() : "other";

  const expenseDate = date ? new Date(date) : new Date();

  const embedding = await getRealEmbedding(`[EXPENSE] ${safeCategory}: ₹${amount} on ${description} (${expenseDate.toISOString().split("T")[0]})`);

  const expense = await prisma.expense.create({
    data: {
      userId,
      amount,
      category: safeCategory,
      description,
      date: expenseDate,
      source: "manual",
      embedding,
    },
  });

  await addToIndex(expense.id, `[EXPENSE] ${safeCategory}: ₹${amount} on ${description} (${expenseDate.toISOString().split("T")[0]})`, "Expense", userId, "private");

  return `Successfully logged expense: ₹${amount} for ${description} under ${safeCategory}.`;
}

async function updateExpense(args: { descriptionSearch: string; newAmount?: number; newCategory?: string; newDescription?: string }, userId: string): Promise<string> {
  const { descriptionSearch, newAmount, newCategory, newDescription } = args;

  const existing = await prisma.expense.findFirst({
    where: { userId, description: { contains: descriptionSearch } },
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

  await removeFromIndex(existing.id, userId);
  await addToIndex(updated.id, `[EXPENSE] ${updated.category}: ₹${updated.amount} on ${updated.description} (${updated.date.toISOString().split("T")[0]})`, "Expense", userId, "private");


  return `Successfully updated expense. Amount is now ₹${updated.amount} for "${updated.description}".`;
}

async function addWellnessLog(args: { mood: number; stressLevel: number; sleepHours?: number; notes?: string }, userId: string): Promise<string> {
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
      userId,
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
    }, userId);
  }

  const embedding = await getRealEmbedding(`[WELLNESS] Mood: ${mood}/5, Stress: ${stressLevel}/5, Sleep: ${sleepHours || 0}h. Notes: ${notes || ""}. Date: ${today.toISOString().split("T")[0]}`);

  const log = await prisma.wellnessLog.create({
    data: {
      userId,
      mood,
      stressLevel,
      sleepHours,
      notes,
      embedding,
    },
  });

  await addToIndex(log.id, `[WELLNESS] Mood: ${mood}/5, Stress: ${stressLevel}/5, Sleep: ${sleepHours || 0}h. Notes: ${notes || ""}. Date: ${today.toISOString().split("T")[0]}`, "WellnessLog", userId, "private");


  return `Successfully logged today's wellness. Mood: ${mood}/5, Stress: ${stressLevel}/5.`;
}

async function updateWellnessLog(args: { dateSearch: string; newMood?: number; newStressLevel?: number; newSleepHours?: number; newNotes?: string }, userId: string): Promise<string> {
  const { dateSearch, newMood, newStressLevel, newSleepHours, newNotes } = args;

  const searchDate = new Date(dateSearch);
  searchDate.setHours(0,0,0,0);
  const nextDay = new Date(searchDate);
  nextDay.setDate(searchDate.getDate() + 1);

  const existing = await prisma.wellnessLog.findFirst({
    where: {
      userId,
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

  await removeFromIndex(existing.id, userId);
  await addToIndex(updated.id, `[WELLNESS] Mood: ${updated.mood}/5, Stress: ${updated.stressLevel}/5, Sleep: ${updated.sleepHours || 0}h. Notes: ${updated.notes || ""}. Date: ${updated.date.toISOString().split("T")[0]}`, "WellnessLog", userId, "private");


  return `Successfully updated wellness log for ${updated.date.toISOString().split("T")[0]}. Mood is now ${updated.mood}/5.`;
}

async function importRecentEmails(userId: string): Promise<string> {
  if (!userId) {
    return "I need you to be logged in to sync emails. Please sign in first.";
  }

  // Check if email sync is enabled
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { id: true, emailSyncEnabled: true, lastEmailSync: true },
  });

  if (!profile) {
    return "I couldn't find your profile. Please complete your onboarding first.";
  }

  try {
    const result = await runEmailSync(profile.id, "chat");

    if (!result.success) {
      return `I tried to sync your emails but ran into an issue: ${result.errorMessage}. You can try again or check your email connection in Settings.`;
    }

    if (result.emailsFound === 0) {
      const lastSync = profile.lastEmailSync;
      const timeSince = lastSync
        ? `${Math.round((Date.now() - lastSync.getTime()) / 60000)} minutes ago`
        : "never";
      return `I synced your inbox — no new campus emails found since your last sync (${timeSince}).`;
    }

    const parts: string[] = [];
    parts.push(`I've synced your inbox! Found ${result.emailsFound} email(s).`);

    if (result.noticesCreated > 0) {
      parts.push(`📋 Added ${result.noticesCreated} new notice(s)`);
    }
    if (result.deadlinesCreated > 0) {
      parts.push(`⏰ Added ${result.deadlinesCreated} new deadline(s)`);
    }
    if (result.schedulesUpdated > 0) {
      parts.push(`📅 Updated ${result.schedulesUpdated} schedule item(s)`);
    }
    if (result.emailsSkipped > 0) {
      parts.push(`🔒 Skipped ${result.emailsSkipped} private/irrelevant email(s)`);
    }

    parts.push(`Sync completed in ${(result.durationMs / 1000).toFixed(1)}s.`);

    return parts.join("\n");
  } catch (error) {
    console.error("[Chat] Email sync failed:", error);
    return "Something went wrong while syncing your emails. Please try again later or check your email connection in Settings.";
  }
}

async function extractSmartNotice(
  args: { title: string; body: string; category?: string; eventDate?: string; venue?: string; actionRequired?: string },
  userId: string
): Promise<string> {
  const { title, body, category, eventDate, venue, actionRequired } = args;
  const validCategories = ["placement", "exam", "event", "hostel", "general"];
  const safeCategory = validCategories.includes(category?.toLowerCase() || "") ? category!.toLowerCase() : "general";

  let parsedEventDate: Date | null = null;
  if (eventDate) {
    const d = new Date(eventDate);
    if (!isNaN(d.getTime())) parsedEventDate = d;
  }

  const embedding = await getRealEmbedding(`[NOTICE] ${title}: ${body} ${venue || ""} ${actionRequired || ""}`);

  const notice = await prisma.notice.create({
    data: {
      userId,
      title,
      body,
      category: safeCategory,
      eventDate: parsedEventDate,
      venue: venue || null,
      actionRequired: actionRequired || null,
      source: "AI Campus Brain Extraction",
      embedding,
    },
  });

  await addToIndex(notice.id, `[NOTICE] ${title}: ${body}`, "Notice", userId, userId ? "private" : "global");

  return `✅ Successfully extracted & saved notice: "${title}" [${safeCategory.toUpperCase()}]. Action: ${actionRequired || "None specified"}${venue ? ` at ${venue}` : ""}.`;
}

async function batchExtractDeadlines(
  args: { deadlines: Array<{ title: string; subject: string; dueDate: string; notes?: string }> },
  userId: string
): Promise<string> {
  if (!args.deadlines || !Array.isArray(args.deadlines) || args.deadlines.length === 0) {
    return "No deadlines found to extract.";
  }

  const saved: string[] = [];

  for (const item of args.deadlines) {
    const parsedDate = new Date(item.dueDate);
    if (isNaN(parsedDate.getTime())) continue;

    const embedding = await getRealEmbedding(`[DEADLINE] ${item.title} (${item.subject}) due ${item.dueDate}. ${item.notes || ""}`);

    const dl = await prisma.deadline.create({
      data: {
        userId,
        title: item.title,
        subject: item.subject,
        dueDate: parsedDate,
        type: item.title.toLowerCase().includes("exam") ? "exam" : item.title.toLowerCase().includes("project") ? "project" : "assignment",
        notes: item.notes || null,
        embedding,
      },
    });

    await addToIndex(dl.id, `[DEADLINE] ${item.title} (${item.subject}) due ${item.dueDate}`, "Deadline", userId, "private");
    saved.push(`• ${item.title} (${item.subject}) - due ${parsedDate.toLocaleDateString("en-IN")}`);
  }

  return `✅ Identified and saved ${saved.length} deadline(s) to your calendar:\n${saved.join("\n")}`;
}

async function saveCollegeDocument(
  args: { title: string; subject: string; content: string; fileName?: string },
  userId: string
): Promise<string> {
  const { title, subject, content, fileName } = args;

  const embedding = await getRealEmbedding(`[NOTE] ${title} (${subject}): ${content}`);

  await prisma.note.create({
    data: {
      userId,
      title,
      subject,
      content,
      fileName: fileName || "Chat Uploaded Document",
      embedding,
    },
  });

  return `📚 Successfully saved document "${title}" under subject "${subject}" to your Campus Brain notes library.`;
}
