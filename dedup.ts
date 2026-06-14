import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany();
  console.log("All companies in DB:", companies.map(c => c.name));
  
  // Group by name
  const nameMap = new Map<string, any[]>();
  for (const c of companies) {
    const key = c.name.toLowerCase();
    if (!nameMap.has(key)) nameMap.set(key, []);
    nameMap.get(key)!.push(c);
  }

  for (const [nameKey, records] of nameMap.entries()) {
    if (records.length > 1) {
      console.log(`Found ${records.length} records for ${nameKey}`);
      // Keep the first one, delete the rest
      const keep = records[0];
      const toDelete = records.slice(1);
      
      for (const d of toDelete) {
        console.log(`Deleting duplicate: ${d.name} (${d.id})`);
        
        // delete associated InterviewExperience
        await prisma.interviewExperience.deleteMany({ where: { companyId: d.id } });
        // delete associated PrepQuestion
        await prisma.prepQuestion.deleteMany({ where: { companyId: d.id } });
        // delete associated CompanyReport
        await prisma.companyReport.deleteMany({ where: { companyId: d.id } });
        // delete associated SkillGapAnalysis
        await prisma.skillGapAnalysis.deleteMany({ where: { companyId: d.id } });
        // delete CompanyPrepGuide
        await prisma.companyPrepGuide.deleteMany({ where: { companyId: d.id } });
        // delete PersonalizedPrepPlan
        await prisma.personalizedPrepPlan.deleteMany({ where: { companyId: d.id } });

        await prisma.company.delete({ where: { id: d.id } });
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
