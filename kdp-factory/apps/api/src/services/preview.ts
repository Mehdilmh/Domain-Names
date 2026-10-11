import { layoutDocument, type AssetInfo, type LayoutResult } from '@kdp/core';
import { prisma } from '../db';
import { badRequest } from '../lib/errors';
import { loadDocument } from './interior';

/** Small LRU of layouts keyed by document revision + format, so previews stay fast while editing. */
const cache = new Map<string, LayoutResult>();
const MAX = 30;

export async function cachedLayout(projectId: string): Promise<{ layout: LayoutResult; revision: number }> {
  const format = await prisma.productFormat.findUniqueOrThrow({ where: { projectId } });
  if (format.format === 'EBOOK') throw badRequest('Kindle eBooks are reflowable; use the EPUB preview instead of print pages.');
  const { doc, revision } = await loadDocument(projectId);
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { workspaceId: true } });
  const assetRows = await prisma.asset.findMany({ where: { workspaceId: project.workspaceId, mimeType: { startsWith: 'image/' } }, select: { id: true, widthPx: true, heightPx: true, mimeType: true, createdAt: true } });
  const key = `${projectId}:${revision}:${format.updatedAt.getTime()}:${assetRows.length}`;
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return { layout: hit, revision };
  }
  const assets: Record<string, AssetInfo> = {};
  for (const a of assetRows) if (a.widthPx && a.heightPx) assets[a.id] = { widthPx: a.widthPx, heightPx: a.heightPx, mimeType: a.mimeType };
  const layout = layoutDocument(doc, {
    format: { format: format.format as 'PAPERBACK' | 'HARDCOVER', trimId: format.trimId, ink: format.ink as never, paper: format.paper as never, bleed: format.bleed },
    direction: format.direction as 'LTR' | 'RTL',
    assets,
  });
  cache.set(key, layout);
  while (cache.size > MAX) cache.delete(cache.keys().next().value!);
  return { layout, revision };
}
