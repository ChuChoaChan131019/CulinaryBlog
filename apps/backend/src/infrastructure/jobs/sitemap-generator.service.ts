import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, asc, eq } from 'drizzle-orm';
import { DATABASE_CONNECTION, Database } from '../database/database.module';
import { categories, recipes } from '../database/schema';

export type SitemapChangeFrequency =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never';

export interface SitemapUrlEntry {
  loc: string;
  lastmod?: Date;
  changefreq: SitemapChangeFrequency;
  priority: number;
}

export interface SitemapGenerationResult {
  xml: string;
  urlCount: number;
  recipeCount: number;
  categoryCount: number;
}

export interface SitemapDatedRecord {
  updatedAt: Date | null;
  publishedAt?: Date | null;
  createdAt: Date;
}

const SITEMAP_NAMESPACE = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const MAX_URL_COUNT = 50_000;
const MAX_XML_BYTES = 50 * 1024 * 1024;

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function renderSitemap(entries: SitemapUrlEntry[]): string {
  const body = entries
    .map((entry) => {
      const lastmod = entry.lastmod
        ? `\n    <lastmod>${entry.lastmod.toISOString()}</lastmod>`
        : '';
      return [
        '  <url>',
        `    <loc>${escapeXml(entry.loc)}</loc>${lastmod}`,
        `    <changefreq>${entry.changefreq}</changefreq>`,
        `    <priority>${entry.priority.toFixed(1)}</priority>`,
        '  </url>',
      ].join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<urlset xmlns="${SITEMAP_NAMESPACE}">`,
    body,
    '</urlset>',
    '',
  ].join('\n');
}

export function latestDate(records: SitemapDatedRecord[]): Date | undefined {
  const dates = records.flatMap((record) => [
    record.updatedAt,
    record.publishedAt ?? null,
    record.createdAt,
  ]).filter((date): date is Date => date instanceof Date);

  if (dates.length === 0) return undefined;
  return new Date(Math.max(...dates.map((date) => date.getTime())));
}

@Injectable()
export class SitemapGeneratorService {
  private readonly siteUrl: string;

  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    config: ConfigService,
  ) {
    this.siteUrl = normalizeSiteUrl(
      config.get<string>('PUBLIC_SITE_URL', 'http://localhost:3000'),
    );
  }

  async generate(): Promise<SitemapGenerationResult> {
    const [recipeRows, categoryRows] = await Promise.all([
      this.db
        .select({
          slug: recipes.slug,
          updatedAt: recipes.updatedAt,
          publishedAt: recipes.publishedAt,
          createdAt: recipes.createdAt,
        })
        .from(recipes)
        .where(
          and(eq(recipes.status, 'Published'), eq(recipes.isDeleted, false)),
        )
        .orderBy(asc(recipes.slug)),
      this.db
        .select({
          slug: categories.slug,
          updatedAt: categories.updatedAt,
          createdAt: categories.createdAt,
        })
        .from(categories)
        .where(eq(categories.isDeleted, false))
        .orderBy(asc(categories.slug)),
    ]);

    const recipesLastmod = latestDate(recipeRows);
    const categoriesLastmod = latestDate(categoryRows);
    const entries: SitemapUrlEntry[] = [
      {
        loc: this.url('/'),
        lastmod: latestDate([...recipeRows, ...categoryRows]),
        changefreq: 'daily',
        priority: 1.0,
      },
      {
        loc: this.url('/recipes'),
        lastmod: recipesLastmod,
        changefreq: 'daily',
        priority: 0.9,
      },
      {
        loc: this.url('/categories'),
        lastmod: categoriesLastmod,
        changefreq: 'weekly',
        priority: 0.8,
      },
      ...categoryRows.map((category) => ({
        loc: this.url(`/categories/${encodeURIComponent(category.slug)}`),
        lastmod: category.updatedAt ?? category.createdAt,
        changefreq: 'weekly' as const,
        priority: 0.7,
      })),
      ...recipeRows.map((recipe) => ({
        loc: this.url(`/recipes/${encodeURIComponent(recipe.slug)}`),
        lastmod: recipe.updatedAt ?? recipe.publishedAt ?? recipe.createdAt,
        changefreq: 'weekly' as const,
        priority: 0.8,
      })),
    ];

    const uniqueEntries = [...new Map(entries.map((entry) => [entry.loc, entry])).values()];

    if (uniqueEntries.length > MAX_URL_COUNT) {
      throw new Error(
        `Sitemap contains ${uniqueEntries.length} URLs; maximum supported is ${MAX_URL_COUNT}.`,
      );
    }

    const xml = renderSitemap(uniqueEntries);
    const size = Buffer.byteLength(xml, 'utf8');
    if (size > MAX_XML_BYTES) {
      throw new Error(
        `Sitemap is ${size} bytes; maximum supported is ${MAX_XML_BYTES} bytes.`,
      );
    }

    return {
      xml,
      urlCount: uniqueEntries.length,
      recipeCount: recipeRows.length,
      categoryCount: categoryRows.length,
    };
  }

  private url(path: string): string {
    return new URL(path, `${this.siteUrl}/`).toString();
  }
}

function normalizeSiteUrl(value: string): string {
  const url = new URL(value);
  return url.toString().replace(/\/+$/, '');
}
