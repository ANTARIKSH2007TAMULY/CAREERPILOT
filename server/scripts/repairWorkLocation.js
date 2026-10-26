import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Job from '../models/Job.js';
import { mapWorkMode } from '../services/jobs/jobSchema.js';

dotenv.config();

export async function repairStoredJobs({ batchSize = 500 } = {}) {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not defined');
    return { success: false, error: 'MONGODB_URI missing' };
  }

  const isConnected = mongoose.connection.readyState === 1;
  if (!isConnected) {
    await mongoose.connect(uri);
  }

  console.log('[Repair] Starting work-location re-classification...');
  const cursor = Job.find({}).cursor();

  let total = 0;
  let updatedCount = 0;
  const distribution = { Remote: 0, Hybrid: 0, 'On-site': 0, Unspecified: 0 };
  let batch = [];

  for await (const doc of cursor) {
    total++;

    const isMuseRemote =
      doc.source === 'The Muse' &&
      Array.isArray(doc.metadata?.rawLocations) &&
      doc.metadata.rawLocations.some((l) => /flexible\s*\/\s*remote|remote/i.test(l));

    const computedWorkMode = mapWorkMode({
      workMode: isMuseRemote ? 'Remote' : (doc.workMode === 'Remote' ? '' : doc.workMode),
      title: doc.title,
      description: doc.description,
      location: doc.location,
      remote: isMuseRemote ? true : undefined,
    });

    distribution[computedWorkMode] = (distribution[computedWorkMode] || 0) + 1;

    // Check if update is needed
    if (doc.workMode !== computedWorkMode) {
      batch.push({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: {
              workMode: computedWorkMode,
              'metadata.reclassifiedAt': new Date(),
              'metadata.previousWorkMode': doc.workMode,
            },
          },
        },
      });
      updatedCount++;
    }

    if (batch.length >= batchSize) {
      await Job.bulkWrite(batch, { ordered: false });
      console.log(`[Repair] Processed ${total} jobs (${updatedCount} reclassified so far)...`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await Job.bulkWrite(batch, { ordered: false });
  }

  console.log('[Repair] Completed successfully!');
  console.log(`[Repair] Total jobs evaluated: ${total}`);
  console.log(`[Repair] Total jobs updated: ${updatedCount}`);
  console.log('[Repair] New distribution:', distribution);

  return {
    success: true,
    total,
    updatedCount,
    distribution,
  };
}

// Run directly if invoked via CLI
if (process.argv[1]?.endsWith('repairWorkLocation.js')) {
  repairStoredJobs()
    .then((stats) => {
      console.log('[Repair] Summary:', JSON.stringify(stats, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Repair] Error:', err);
      process.exit(1);
    });
}
