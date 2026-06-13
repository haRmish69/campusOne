import re

with open('campus_ecosystem.md', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Replace profileId with userId
text = text.replace('profileId', 'userId')
text = text.replace('profileIds', 'userIds')

# 2. Add instituteName String to all models
models_to_update = [
    'InterviewExperience', 'PrepQuestion', 'CompanyPrepGuide',
    'TransportRoute', 'TransportUpdate', 'CabPoolRequest',
    'CampusService', 'ProcessGuide', 'NutritionEstimate',
    'CanteenItem', 'GroupOrder', 'LocalPlace',
    'TripRecommendation', 'SurvivalTip'
]

for model in models_to_update:
    pattern = r'(model ' + model + r' \{\n)'
    replacement = r'\1  instituteName String\n'
    text = re.sub(pattern, replacement, text)

# 3. Add hackathon readiness notes
text = text.replace('Extend lib/alertEngine.ts with new Ring 3 alert types:', 'Create lib/alertEngine.ts with new Ring 3 alert types (since it does not exist yet):')

# 4. Fix the nutrition estimator logic bug mentioned before
text = text.replace('missedMeals = Math.max(0, expectedRatings - ratingsThisWeek * 3)', 'missedMeals = Math.max(0, expectedRatings - ratingsThisWeek)')

# Add notes at the top
notes = """
> [!TIP]
> **Hackathon Readiness Note:**
> To keep velocity high for the 100-student hackathon scale:
> 1. We will intentionally omit Prisma `@relation` foreign keys for cross-references (e.g. `MealRating.messMenuId`) to keep schemas flexible.
> 2. `searchEverything` in Phase 21 will use in-memory Javascript cosine similarity rather than a complex FAISS setup for 13 tables, which is perfectly fast enough for <100 students.
> 3. The Peer System (`ExpertiseSeed`, `LearningMatch`, `PeerNotification`) is already present in the codebase, so no Phase 14.5 is needed!

"""
text = text.replace('Read PROJECT_CONTEXT.md before every phase.', 'Read PROJECT_CONTEXT.md before every phase.\n' + notes)

with open('campus_ecosystem.md', 'w', encoding='utf-8') as f:
    f.write(text)

print("Done")
