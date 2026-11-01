import crypto from 'node:crypto';

/**
 * The single definition of the dataset checksum. Both the full verifier and the
 * CI drift check must hash exactly the same payload, so it lives here.
 */
export function datasetChecksumPayload(dataset) {
  return dataset.surahs
    .map((surah) =>
      surah.ayahs.map((ayah) => `${surah.number}:${ayah.n}\t${ayah.arabic}\t${ayah.english}`).join('\n')
    )
    .join('\n');
}

export function computeDatasetChecksum(dataset) {
  return crypto.createHash('sha256').update(datasetChecksumPayload(dataset), 'utf8').digest('hex');
}
