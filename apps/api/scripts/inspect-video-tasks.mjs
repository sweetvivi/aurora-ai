import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const adapter = new PrismaPg({
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://aurora:aurora@localhost:5432/aurora?schema=public',
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const tasks = await prisma.videoTask.findMany({
    include: { resultFile: true, sourceFile: true },
    orderBy: { createdAt: 'desc' },
    take: 8,
  });

  console.log(
    JSON.stringify(
      tasks.map((task) => ({
        createdAt: task.createdAt,
        id: task.id,
        modelAlias: task.modelAlias,
        prompt: task.prompt?.slice(0, 40),
        resultFileId: task.resultFileId,
        resultMime: task.resultFile?.mimeType,
        resultPath: task.resultFile?.storagePath,
        resultSize: task.resultFile?.size,
        sourceFileId: task.sourceFileId,
        status: task.status,
      })),
      null,
      2,
    ),
  );

  const counts = await prisma.$transaction([
    prisma.videoTask.count(),
    prisma.fileAsset.count({ where: { mimeType: { startsWith: 'video/' } } }),
  ]);

  console.log(JSON.stringify({ videoTasks: counts[0], videoAssets: counts[1] }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
