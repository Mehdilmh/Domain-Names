import { CoverDesign, inspectPdf, layoutCover, renderCoverSvg, starterCoverDesign, COVER_THEMES } from '@kdp/core';
import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { audit } from '../lib/audit';
import { badRequest, conflict, notFound } from '../lib/errors';
import { defineRoute, IdParams } from '../lib/route';
import { currentMetadata } from '../services/build';
import { projectCoverGeometry } from '../services/cover';
import { getProject } from '../services/projects';

export const coverRouter = Router();
const CoverParams = z.object({ id: z.string(), coverId: z.string() });

async function getCover(projectId: string, coverId: string) {
  const c = await prisma.coverDesign.findFirst({ where: { id: coverId, projectId } });
  if (!c) throw notFound('Cover design');
  return c;
}

async function assetInfo(workspaceId: string, design: CoverDesign) {
  const ids = design.layers.filter((l) => l.type === 'image').map((l) => (l as { assetId: string }).assetId);
  if (design.templateGuide) ids.push(design.templateGuide.assetId);
  const rows = await prisma.asset.findMany({ where: { workspaceId, id: { in: ids } } });
  return Object.fromEntries(rows.filter((r) => r.widthPx && r.heightPx).map((r) => [r.id, { widthPx: r.widthPx!, heightPx: r.heightPx!, mimeType: r.mimeType }]));
}

defineRoute(coverRouter, { method: 'get', path: '/projects/:id/covers', summary: 'Cover designs, geometry for the current page count, and themes', tag: 'Covers', params: IdParams }, async ({ ws, params }) => {
  await getProject(ws.workspaceId, params.id);
  const [covers, geometry] = await Promise.all([prisma.coverDesign.findMany({ where: { projectId: params.id }, orderBy: { updatedAt: 'desc' } }), projectCoverGeometry(params.id)]);
  return { covers, geometry, themes: COVER_THEMES };
});

defineRoute(coverRouter, { method: 'post', path: '/projects/:id/covers', summary: 'Create a cover design (starter or supplied design)', tag: 'Covers', params: IdParams, body: z.object({ name: z.string().max(100).default('Cover'), design: z.unknown().optional(), themeId: z.string().max(40).optional() }), status: 201 }, async ({ ws, params, body, req }) => {
  const p = await getProject(ws.workspaceId, params.id);
  let design: CoverDesign;
  if (body.design) design = CoverDesign.parse(body.design);
  else {
    const geom = await projectCoverGeometry(p.id);
    if (geom.source === 'UNRESOLVED') throw conflict('Enter the official KDP hardcover calculator values (Format → Official cover template) before designing a hardcover cover.');
    const { data: md } = await currentMetadata(p.id);
    const brief = await prisma.productBrief.findUnique({ where: { projectId: p.id } });
    design = starterCoverDesign(geom, { title: md.title || p.title, subtitle: md.subtitle, author: md.author || brief?.authorName || '', backText: md.description || undefined, themeId: body.themeId ?? brief?.designTheme });
  }
  await prisma.coverDesign.updateMany({ where: { projectId: p.id }, data: { isActive: false } });
  const c = await prisma.coverDesign.create({ data: { projectId: p.id, name: body.name, design: design as unknown as Prisma.InputJsonValue, isActive: true } });
  await prisma.project.update({ where: { id: p.id }, data: { updatedAt: new Date() } });
  await audit(req, 'cover.create', 'CoverDesign', c.id);
  return c;
});

defineRoute(coverRouter, { method: 'put', path: '/projects/:id/covers/:coverId', summary: 'Save a cover design (optimistic concurrency)', tag: 'Covers', params: CoverParams, body: z.object({ revision: z.number().int(), name: z.string().max(100).optional(), design: z.unknown() }) }, async ({ ws, params, body }) => {
  await getProject(ws.workspaceId, params.id);
  const c = await getCover(params.id, params.coverId);
  if (c.revision !== body.revision) throw conflict('Cover changed since you loaded it. Reload to continue.', { revision: c.revision });
  const design = CoverDesign.parse(body.design);
  // Locked layers cannot be changed.
  const prev = CoverDesign.parse(c.design);
  for (const l of prev.layers.filter((x) => x.locked)) {
    const n = design.layers.find((x) => x.id === l.id);
    if (!n || JSON.stringify({ ...n }) !== JSON.stringify({ ...l })) throw badRequest(`Layer "${l.name || l.id}" is locked.`);
  }
  return prisma.coverDesign.update({ where: { id: c.id }, data: { design: design as unknown as Prisma.InputJsonValue, name: body.name, revision: { increment: 1 } } });
});

defineRoute(coverRouter, { method: 'post', path: '/projects/:id/covers/:coverId/duplicate', summary: 'Duplicate a cover design', tag: 'Covers', params: CoverParams, status: 201 }, async ({ ws, params }) => {
  await getProject(ws.workspaceId, params.id);
  const c = await getCover(params.id, params.coverId);
  return prisma.coverDesign.create({ data: { projectId: params.id, name: `${c.name} (copy)`.slice(0, 100), design: c.design as Prisma.InputJsonValue, isActive: false } });
});

defineRoute(coverRouter, { method: 'post', path: '/projects/:id/covers/:coverId/activate', summary: 'Use this design for exports', tag: 'Covers', params: CoverParams }, async ({ ws, params }) => {
  await getProject(ws.workspaceId, params.id);
  const c = await getCover(params.id, params.coverId);
  await prisma.coverDesign.updateMany({ where: { projectId: params.id }, data: { isActive: false } });
  return prisma.coverDesign.update({ where: { id: c.id }, data: { isActive: true } });
});

defineRoute(coverRouter, { method: 'delete', path: '/projects/:id/covers/:coverId', summary: 'Delete a cover design', tag: 'Covers', params: CoverParams }, async ({ ws, params }) => {
  await getProject(ws.workspaceId, params.id);
  const c = await getCover(params.id, params.coverId);
  await prisma.coverDesign.delete({ where: { id: c.id } });
  return { ok: true };
});

defineRoute(
  coverRouter,
  { method: 'post', path: '/projects/:id/covers/:coverId/check', summary: 'Lay out a (possibly unsaved) design and return warnings + SVG preview', tag: 'Covers', params: CoverParams, body: z.object({ design: z.unknown(), guides: z.boolean().default(true) }) },
  async ({ ws, params, body }) => {
    await getProject(ws.workspaceId, params.id);
    await getCover(params.id, params.coverId);
    const design = CoverDesign.parse(body.design);
    const geom = await projectCoverGeometry(params.id);
    const layout = layoutCover(design, geom, await assetInfo(ws.workspaceId, design));
    const guideHref = design.templateGuide ? `/api/assets/${design.templateGuide.assetId}/file` : undefined;
    return {
      geometry: geom,
      warnings: layout.warnings,
      svg: renderCoverSvg(layout, { guides: body.guides, assetHref: (id) => `/api/assets/${encodeURIComponent(id)}/file`, templateGuideHref: guideHref, templateGuideOpacity: design.templateGuide?.opacity }),
    };
  },
);

/**
 * Import an official KDP cover template PDF (uploaded as an asset). The PDF page size gives the
 * full cover dimensions; the publisher confirms the spine width (and wrap/hinge for hardcover).
 */
defineRoute(
  coverRouter,
  {
    method: 'post',
    path: '/projects/:id/official-template',
    summary: 'Record official KDP cover calculator values (optionally from an uploaded template PDF)',
    tag: 'Covers',
    params: IdParams,
    body: z.object({ assetId: z.string().optional(), fullWidthIn: z.number().positive().optional(), fullHeightIn: z.number().positive().optional(), spineWidthIn: z.number().nonnegative(), wrapIn: z.number().nonnegative().optional(), hingeIn: z.number().nonnegative().optional(), pageCount: z.number().int().positive() }),
  },
  async ({ ws, params, body, req }) => {
    const p = await getProject(ws.workspaceId, params.id);
    let w = body.fullWidthIn;
    let h = body.fullHeightIn;
    let note = 'Entered from the official KDP cover calculator';
    if (body.assetId) {
      const a = await prisma.asset.findFirst({ where: { id: body.assetId, workspaceId: ws.workspaceId } });
      if (!a) throw notFound('Template asset');
      if (a.mimeType !== 'application/pdf') throw badRequest('Upload the official template as a PDF to read its dimensions.');
      const { getStorage } = await import('../lib/storage');
      const ins = await inspectPdf(await getStorage().get(a.storageKey));
      if (!ins.ok || ins.pageCount < 1) throw badRequest('Template PDF could not be read.');
      w = ins.pages[0].mediaBoxIn.w;
      h = ins.pages[0].mediaBoxIn.h;
      note = `Official template PDF "${a.filename}" (${w}" × ${h}")`;
    }
    if (!w || !h) throw badRequest('Provide fullWidthIn/fullHeightIn or an uploaded template PDF.');
    const official = { fullWidthIn: w, fullHeightIn: h, spineWidthIn: body.spineWidthIn, wrapIn: body.wrapIn, hingeIn: body.hingeIn, pageCount: body.pageCount, sourceNote: note, importedAt: new Date().toISOString().slice(0, 10) };
    await prisma.productFormat.update({ where: { projectId: p.id }, data: { officialCover: official } });
    await audit(req, 'cover.official_template', 'Project', p.id, official);
    return { official, geometry: await projectCoverGeometry(p.id) };
  },
);
