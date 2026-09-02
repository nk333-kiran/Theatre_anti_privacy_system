import { prisma, UserRole, ContentStatus, ReleaseStatus, ShowStatus, TicketStatus } from "@antipiracy/database";
import crypto from "crypto";
import { logger } from "../logging/logger";

export type ImportEntityType =
  | "production-companies"
  | "theatres"
  | "screens"
  | "users"
  | "movies"
  | "movie-releases"
  | "shows"
  | "tickets";

export interface ImportErrorDetail {
  index: number;
  row: Record<string, any>;
  message: string;
  field?: string;
}

export interface ImportReport {
  entityType: ImportEntityType;
  totalRecords: number;
  inserted: number;
  skipped: number;
  failed: number;
  dryRun: boolean;
  errors: ImportErrorDetail[];
  summary: string;
  timestamp: string;
}

export interface ImportOptions {
  dryRun?: boolean;
  skipDuplicates?: boolean;
  actorUserId?: string;
  actorEmail?: string;
}

/**
 * Robust CSV parser that handles quotes, escaped quotes, commas inside quotes, CRLF/LF.
 */
export function parseCsv(csvString: string): Record<string, string>[] {
  const lines = csvString.trim().split(/\r\n|\n|\r/);
  if (lines.length === 0 || !lines[0].trim()) return [];

  const parseRow = (line: string): string[] => {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    return fields;
  };

  const headers = parseRow(lines[0]).map((h) => h.replace(/^["']|["']$/g, "").trim());
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue; // Skip blank lines
    const values = parseRow(rawLine);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      let val = values[idx] !== undefined ? values[idx] : "";
      // Strip surrounding quotes if present
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      row[header] = val;
    });
    records.push(row);
  }

  return records;
}

export class DataImportService {
  private static instance: DataImportService;

  private constructor() {}

  public static getInstance(): DataImportService {
    if (!DataImportService.instance) {
      DataImportService.instance = new DataImportService();
    }
    return DataImportService.instance;
  }

  /**
   * Main import dispatcher
   */
  public async importData(
    entityType: ImportEntityType,
    rawData: Record<string, any>[] | string,
    options: ImportOptions = {}
  ): Promise<ImportReport> {
    const dryRun = options.dryRun ?? true;
    const skipDuplicates = options.skipDuplicates ?? true;

    // Convert CSV string to array if needed
    let records: Record<string, any>[] = [];
    if (typeof rawData === "string") {
      records = parseCsv(rawData);
    } else if (Array.isArray(rawData)) {
      records = rawData;
    } else {
      throw new Error("Invalid raw data: expected an array of objects or CSV string");
    }

    const report: ImportReport = {
      entityType,
      totalRecords: records.length,
      inserted: 0,
      skipped: 0,
      failed: 0,
      dryRun,
      errors: [],
      summary: "",
      timestamp: new Date().toISOString(),
    };

    if (records.length === 0) {
      report.summary = "No records provided to import.";
      return report;
    }

    logger.info(`[DataImport] Starting import for entity '${entityType}' (Total: ${records.length}, DryRun: ${dryRun})`);

    switch (entityType) {
      case "production-companies":
        await this.importProductionCompanies(records, report, dryRun, skipDuplicates);
        break;
      case "theatres":
        await this.importTheatres(records, report, dryRun, skipDuplicates);
        break;
      case "screens":
        await this.importScreens(records, report, dryRun, skipDuplicates);
        break;
      case "users":
        await this.importUsers(records, report, dryRun, skipDuplicates);
        break;
      case "movies":
        await this.importMovies(records, report, dryRun, skipDuplicates);
        break;
      case "movie-releases":
        await this.importMovieReleases(records, report, dryRun, skipDuplicates);
        break;
      case "shows":
        await this.importShows(records, report, dryRun, skipDuplicates);
        break;
      case "tickets":
        await this.importTickets(records, report, dryRun, skipDuplicates);
        break;
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }

    report.summary = `Processed ${report.totalRecords} records: ${report.inserted} inserted, ${report.skipped} skipped, ${report.failed} failed. (${dryRun ? "DRY RUN - No DB changes" : "COMMITTED"})`;

    // Audit log if committed
    if (!dryRun && report.inserted > 0) {
      try {
        await prisma.securityAuditLog.create({
          data: {
            eventType: "TICKET_CREATED",
            severity: "INFO",
            userId: options.actorUserId || null,
            actorEmail: options.actorEmail || "system.import",
            actionSummary: `Data Import: ${report.inserted} ${entityType} imported successfully.`,
            metadata: JSON.stringify({
              entityType,
              totalRecords: report.totalRecords,
              inserted: report.inserted,
              skipped: report.skipped,
              failed: report.failed,
            }),
          },
        });
      } catch (logErr) {
        logger.warn("[DataImport] Failed to write audit log:", { error: String(logErr) });
      }
    }

    return report;
  }

  // ============================================================================
  // 1. PRODUCTION COMPANIES
  // ============================================================================
  private async importProductionCompanies(
    records: Record<string, any>[],
    report: ImportReport,
    dryRun: boolean,
    skipDuplicates: boolean
  ): Promise<void> {
    const validRows: any[] = [];
    const seenCodes = new Set<string>();

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const name = String(row.name || "").trim();
      const code = String(row.code || "").trim().toUpperCase();
      const contactEmail = String(row.contactEmail || "").trim();
      const contactPhone = row.contactPhone ? String(row.contactPhone).trim() : null;
      const status = row.status ? String(row.status).trim().toUpperCase() : "ACTIVE";

      if (!name) {
        report.errors.push({ index: i + 1, row, message: "Field 'name' is required", field: "name" });
        report.failed++;
        continue;
      }
      if (!code) {
        report.errors.push({ index: i + 1, row, message: "Field 'code' is required", field: "code" });
        report.failed++;
        continue;
      }
      if (!contactEmail || !contactEmail.includes("@")) {
        report.errors.push({ index: i + 1, row, message: "Valid 'contactEmail' is required", field: "contactEmail" });
        report.failed++;
        continue;
      }
      if (seenCodes.has(code)) {
        report.errors.push({ index: i + 1, row, message: `Duplicate code '${code}' in import dataset`, field: "code" });
        report.failed++;
        continue;
      }
      seenCodes.add(code);

      // Check DB existence
      const existing = await prisma.productionCompany.findUnique({ where: { code } });
      if (existing) {
        if (skipDuplicates) {
          report.skipped++;
          continue;
        } else {
          report.errors.push({ index: i + 1, row, message: `Production company code '${code}' already exists in database`, field: "code" });
          report.failed++;
          continue;
        }
      }

      validRows.push({ name, code, contactEmail, contactPhone, status });
    }

    if (!dryRun && validRows.length > 0 && report.failed === 0) {
      await prisma.$transaction(async (tx) => {
        for (const r of validRows) {
          await tx.productionCompany.create({ data: r });
          report.inserted++;
        }
      });
    } else if (dryRun) {
      report.inserted = validRows.length;
    }
  }

  // ============================================================================
  // 2. THEATRES
  // ============================================================================
  private async importTheatres(
    records: Record<string, any>[],
    report: ImportReport,
    dryRun: boolean,
    skipDuplicates: boolean
  ): Promise<void> {
    const validRows: any[] = [];
    const seenCodes = new Set<string>();

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const name = String(row.name || "").trim();
      const code = String(row.code || "").trim().toUpperCase();
      const location = String(row.location || "").trim();
      const address = row.address ? String(row.address).trim() : null;
      const contactEmail = row.contactEmail ? String(row.contactEmail).trim() : null;
      const contactPhone = row.contactPhone ? String(row.contactPhone).trim() : null;
      const permanentQrCode = row.permanentQrCode
        ? String(row.permanentQrCode).trim()
        : `QR-THEATRE-${code}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

      if (!name) {
        report.errors.push({ index: i + 1, row, message: "Field 'name' is required", field: "name" });
        report.failed++;
        continue;
      }
      if (!code) {
        report.errors.push({ index: i + 1, row, message: "Field 'code' is required", field: "code" });
        report.failed++;
        continue;
      }
      if (!location) {
        report.errors.push({ index: i + 1, row, message: "Field 'location' is required", field: "location" });
        report.failed++;
        continue;
      }
      if (seenCodes.has(code)) {
        report.errors.push({ index: i + 1, row, message: `Duplicate theatre code '${code}' in batch`, field: "code" });
        report.failed++;
        continue;
      }
      seenCodes.add(code);

      const existing = await prisma.theatre.findUnique({ where: { code } });
      if (existing) {
        if (skipDuplicates) {
          report.skipped++;
          continue;
        } else {
          report.errors.push({ index: i + 1, row, message: `Theatre code '${code}' already exists`, field: "code" });
          report.failed++;
          continue;
        }
      }

      validRows.push({ name, code, location, address, contactEmail, contactPhone, permanentQrCode });
    }

    if (!dryRun && validRows.length > 0 && report.failed === 0) {
      await prisma.$transaction(async (tx) => {
        for (const r of validRows) {
          await tx.theatre.create({ data: r });
          report.inserted++;
        }
      });
    } else if (dryRun) {
      report.inserted = validRows.length;
    }
  }

  // ============================================================================
  // 3. SCREENS
  // ============================================================================
  private async importScreens(
    records: Record<string, any>[],
    report: ImportReport,
    dryRun: boolean,
    skipDuplicates: boolean
  ): Promise<void> {
    const validRows: any[] = [];
    const seenScreens = new Set<string>();

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const theatreCode = row.theatreCode ? String(row.theatreCode).trim().toUpperCase() : null;
      let theatreId = row.theatreId ? String(row.theatreId).trim() : null;
      const screenNumber = parseInt(row.screenNumber, 10);
      const name = String(row.name || `Screen ${screenNumber}`).trim();
      const capacity = parseInt(row.capacity, 10);

      if (isNaN(screenNumber) || screenNumber <= 0) {
        report.errors.push({ index: i + 1, row, message: "Field 'screenNumber' must be a positive integer", field: "screenNumber" });
        report.failed++;
        continue;
      }
      if (isNaN(capacity) || capacity <= 0) {
        report.errors.push({ index: i + 1, row, message: "Field 'capacity' must be a positive integer", field: "capacity" });
        report.failed++;
        continue;
      }

      // Resolve Theatre by Code or ID
      if (!theatreId && theatreCode) {
        const t = await prisma.theatre.findUnique({ where: { code: theatreCode } });
        if (!t) {
          report.errors.push({ index: i + 1, row, message: `Referenced theatreCode '${theatreCode}' does not exist`, field: "theatreCode" });
          report.failed++;
          continue;
        }
        theatreId = t.id;
      } else if (theatreId) {
        const t = await prisma.theatre.findUnique({ where: { id: theatreId } });
        if (!t) {
          report.errors.push({ index: i + 1, row, message: `Referenced theatreId '${theatreId}' does not exist`, field: "theatreId" });
          report.failed++;
          continue;
        }
      } else {
        report.errors.push({ index: i + 1, row, message: "Either 'theatreCode' or 'theatreId' is required", field: "theatreCode" });
        report.failed++;
        continue;
      }

      const key = `${theatreId}:${screenNumber}`;
      if (seenScreens.has(key)) {
        report.errors.push({ index: i + 1, row, message: `Duplicate screen number ${screenNumber} for theatre in batch`, field: "screenNumber" });
        report.failed++;
        continue;
      }
      seenScreens.add(key);

      const existing = await prisma.screen.findUnique({
        where: { theatreId_screenNumber: { theatreId, screenNumber } },
      });
      if (existing) {
        if (skipDuplicates) {
          report.skipped++;
          continue;
        } else {
          report.errors.push({ index: i + 1, row, message: `Screen ${screenNumber} already exists in theatre`, field: "screenNumber" });
          report.failed++;
          continue;
        }
      }

      validRows.push({ theatreId, screenNumber, name, capacity });
    }

    if (!dryRun && validRows.length > 0 && report.failed === 0) {
      await prisma.$transaction(async (tx) => {
        for (const r of validRows) {
          await tx.screen.create({ data: r });
          report.inserted++;
        }
      });
    } else if (dryRun) {
      report.inserted = validRows.length;
    }
  }

  // ============================================================================
  // 4. USERS
  // ============================================================================
  private async importUsers(
    records: Record<string, any>[],
    report: ImportReport,
    dryRun: boolean,
    skipDuplicates: boolean
  ): Promise<void> {
    const validRows: any[] = [];
    const seenEmails = new Set<string>();

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const email = String(row.email || "").trim().toLowerCase();
      const name = String(row.name || "").trim();
      const roleStr = String(row.role || "THEATRE_STAFF").trim().toUpperCase();
      const rawPassword = row.password ? String(row.password).trim() : "InitialSecurePass2026!";
      const passwordHash = crypto.createHash("sha256").update(rawPassword).digest("hex");
      const theatreCode = row.theatreCode ? String(row.theatreCode).trim().toUpperCase() : null;
      let theatreId = row.theatreId ? String(row.theatreId).trim() : null;
      const companyCode = row.productionCompanyCode ? String(row.productionCompanyCode).trim().toUpperCase() : null;
      let productionCompanyId = row.productionCompanyId ? String(row.productionCompanyId).trim() : null;

      if (!email || !email.includes("@")) {
        report.errors.push({ index: i + 1, row, message: "Valid 'email' is required", field: "email" });
        report.failed++;
        continue;
      }
      if (!name) {
        report.errors.push({ index: i + 1, row, message: "Field 'name' is required", field: "name" });
        report.failed++;
        continue;
      }

      const validRoles: UserRole[] = ["ADMIN", "THEATRE_ADMIN", "THEATRE_STAFF", "PRODUCTION_COMPANY"];
      if (!validRoles.includes(roleStr as UserRole)) {
        report.errors.push({ index: i + 1, row, message: `Invalid role '${roleStr}'. Allowed: ${validRoles.join(", ")}`, field: "role" });
        report.failed++;
        continue;
      }

      if (seenEmails.has(email)) {
        report.errors.push({ index: i + 1, row, message: `Duplicate email '${email}' in batch`, field: "email" });
        report.failed++;
        continue;
      }
      seenEmails.add(email);

      // Resolve Theatre FK if supplied
      if (!theatreId && theatreCode) {
        const t = await prisma.theatre.findUnique({ where: { code: theatreCode } });
        if (!t) {
          report.errors.push({ index: i + 1, row, message: `Referenced theatreCode '${theatreCode}' does not exist`, field: "theatreCode" });
          report.failed++;
          continue;
        }
        theatreId = t.id;
      }

      // Resolve Production Company FK if supplied
      if (!productionCompanyId && companyCode) {
        const pc = await prisma.productionCompany.findUnique({ where: { code: companyCode } });
        if (!pc) {
          report.errors.push({ index: i + 1, row, message: `Referenced productionCompanyCode '${companyCode}' does not exist`, field: "productionCompanyCode" });
          report.failed++;
          continue;
        }
        productionCompanyId = pc.id;
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        if (skipDuplicates) {
          report.skipped++;
          continue;
        } else {
          report.errors.push({ index: i + 1, row, message: `User with email '${email}' already exists`, field: "email" });
          report.failed++;
          continue;
        }
      }

      validRows.push({
        email,
        name,
        role: roleStr as UserRole,
        passwordHash,
        theatreId: theatreId || null,
        productionCompanyId: productionCompanyId || null,
      });
    }

    if (!dryRun && validRows.length > 0 && report.failed === 0) {
      await prisma.$transaction(async (tx) => {
        for (const r of validRows) {
          await tx.user.create({ data: r });
          report.inserted++;
        }
      });
    } else if (dryRun) {
      report.inserted = validRows.length;
    }
  }

  // ============================================================================
  // 5. MOVIES
  // ============================================================================
  private async importMovies(
    records: Record<string, any>[],
    report: ImportReport,
    dryRun: boolean,
    skipDuplicates: boolean
  ): Promise<void> {
    const validRows: any[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const title = String(row.title || "").trim();
      const durationMinutes = parseInt(row.durationMinutes, 10);
      const language = String(row.language || "English").trim();
      const rating = row.rating ? String(row.rating).trim() : "PG-13";
      const synopsis = row.synopsis ? String(row.synopsis).trim() : null;
      const description = row.description ? String(row.description).trim() : null;
      const releaseDate = row.releaseDate ? new Date(row.releaseDate) : null;
      const contentStatusStr = String(row.contentStatus || "READY").trim().toUpperCase();
      const companyCode = row.productionCompanyCode ? String(row.productionCompanyCode).trim().toUpperCase() : null;
      let productionCompanyId = row.productionCompanyId ? String(row.productionCompanyId).trim() : null;

      if (!title) {
        report.errors.push({ index: i + 1, row, message: "Field 'title' is required", field: "title" });
        report.failed++;
        continue;
      }
      if (isNaN(durationMinutes) || durationMinutes <= 0) {
        report.errors.push({ index: i + 1, row, message: "Field 'durationMinutes' must be a positive integer", field: "durationMinutes" });
        report.failed++;
        continue;
      }
      if (releaseDate && isNaN(releaseDate.getTime())) {
        report.errors.push({ index: i + 1, row, message: "Invalid date format for 'releaseDate'", field: "releaseDate" });
        report.failed++;
        continue;
      }

      // Production Company resolution
      if (!productionCompanyId && companyCode) {
        const pc = await prisma.productionCompany.findUnique({ where: { code: companyCode } });
        if (!pc) {
          report.errors.push({ index: i + 1, row, message: `Referenced productionCompanyCode '${companyCode}' not found`, field: "productionCompanyCode" });
          report.failed++;
          continue;
        }
        productionCompanyId = pc.id;
      }

      const existing = await prisma.movie.findFirst({
        where: { title, language },
      });
      if (existing) {
        if (skipDuplicates) {
          report.skipped++;
          continue;
        } else {
          report.errors.push({ index: i + 1, row, message: `Movie '${title}' (${language}) already exists`, field: "title" });
          report.failed++;
          continue;
        }
      }

      validRows.push({
        title,
        durationMinutes,
        language,
        rating,
        synopsis,
        description,
        releaseDate,
        contentStatus: (contentStatusStr as ContentStatus) || "READY",
        productionCompanyId: productionCompanyId || null,
      });
    }

    if (!dryRun && validRows.length > 0 && report.failed === 0) {
      await prisma.$transaction(async (tx) => {
        for (const r of validRows) {
          await tx.movie.create({ data: r });
          report.inserted++;
        }
      });
    } else if (dryRun) {
      report.inserted = validRows.length;
    }
  }

  // ============================================================================
  // 6. MOVIE RELEASES
  // ============================================================================
  private async importMovieReleases(
    records: Record<string, any>[],
    report: ImportReport,
    dryRun: boolean,
    skipDuplicates: boolean
  ): Promise<void> {
    const validRows: any[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      let movieId = row.movieId ? String(row.movieId).trim() : null;
      const movieTitle = row.movieTitle ? String(row.movieTitle).trim() : null;
      let productionCompanyId = row.productionCompanyId ? String(row.productionCompanyId).trim() : null;
      const companyCode = row.productionCompanyCode ? String(row.productionCompanyCode).trim().toUpperCase() : null;
      let theatreId = row.theatreId ? String(row.theatreId).trim() : null;
      const theatreCode = row.theatreCode ? String(row.theatreCode).trim().toUpperCase() : null;
      const startDate = row.startDate ? new Date(row.startDate) : null;
      const endDate = row.endDate ? new Date(row.endDate) : null;
      const statusStr = String(row.status || "ACTIVE").trim().toUpperCase();

      if (!startDate || isNaN(startDate.getTime())) {
        report.errors.push({ index: i + 1, row, message: "Valid 'startDate' is required", field: "startDate" });
        report.failed++;
        continue;
      }
      if (!endDate || isNaN(endDate.getTime())) {
        report.errors.push({ index: i + 1, row, message: "Valid 'endDate' is required", field: "endDate" });
        report.failed++;
        continue;
      }
      if (startDate.getTime() >= endDate.getTime()) {
        report.errors.push({ index: i + 1, row, message: "'startDate' must be before 'endDate'", field: "startDate" });
        report.failed++;
        continue;
      }

      // Resolve Movie
      if (!movieId && movieTitle) {
        const m = await prisma.movie.findFirst({ where: { title: movieTitle } });
        if (!m) {
          report.errors.push({ index: i + 1, row, message: `Movie with title '${movieTitle}' not found`, field: "movieTitle" });
          report.failed++;
          continue;
        }
        movieId = m.id;
        if (!productionCompanyId && m.productionCompanyId) {
          productionCompanyId = m.productionCompanyId;
        }
      }

      if (!movieId) {
        report.errors.push({ index: i + 1, row, message: "Either 'movieId' or 'movieTitle' is required", field: "movieId" });
        report.failed++;
        continue;
      }

      // Resolve Production Company
      if (!productionCompanyId && companyCode) {
        const pc = await prisma.productionCompany.findUnique({ where: { code: companyCode } });
        if (!pc) {
          report.errors.push({ index: i + 1, row, message: `Production company code '${companyCode}' not found`, field: "productionCompanyCode" });
          report.failed++;
          continue;
        }
        productionCompanyId = pc.id;
      }

      if (!productionCompanyId) {
        report.errors.push({ index: i + 1, row, message: "Production Company must be specified or associated with Movie", field: "productionCompanyId" });
        report.failed++;
        continue;
      }

      // Resolve Theatre
      if (!theatreId && theatreCode) {
        const t = await prisma.theatre.findUnique({ where: { code: theatreCode } });
        if (!t) {
          report.errors.push({ index: i + 1, row, message: `Theatre code '${theatreCode}' not found`, field: "theatreCode" });
          report.failed++;
          continue;
        }
        theatreId = t.id;
      }

      if (!theatreId) {
        report.errors.push({ index: i + 1, row, message: "Either 'theatreId' or 'theatreCode' is required", field: "theatreId" });
        report.failed++;
        continue;
      }

      const existing = await prisma.movieRelease.findFirst({
        where: { movieId, theatreId, startDate, endDate },
      });
      if (existing) {
        if (skipDuplicates) {
          report.skipped++;
          continue;
        } else {
          report.errors.push({ index: i + 1, row, message: "Movie release for this movie/theatre/window already exists", field: "movieId" });
          report.failed++;
          continue;
        }
      }

      validRows.push({
        movieId,
        productionCompanyId,
        theatreId,
        startDate,
        endDate,
        status: (statusStr as ReleaseStatus) || "ACTIVE",
      });
    }

    if (!dryRun && validRows.length > 0 && report.failed === 0) {
      await prisma.$transaction(async (tx) => {
        for (const r of validRows) {
          await tx.movieRelease.create({ data: r });
          report.inserted++;
        }
      });
    } else if (dryRun) {
      report.inserted = validRows.length;
    }
  }

  // ============================================================================
  // 7. SHOWS
  // ============================================================================
  private async importShows(
    records: Record<string, any>[],
    report: ImportReport,
    dryRun: boolean,
    skipDuplicates: boolean
  ): Promise<void> {
    const validRows: any[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      let theatreId = row.theatreId ? String(row.theatreId).trim() : null;
      const theatreCode = row.theatreCode ? String(row.theatreCode).trim().toUpperCase() : null;
      let screenId = row.screenId ? String(row.screenId).trim() : null;
      const screenNumber = row.screenNumber ? parseInt(row.screenNumber, 10) : null;
      let movieId = row.movieId ? String(row.movieId).trim() : null;
      const movieTitle = row.movieTitle ? String(row.movieTitle).trim() : null;
      const startTime = row.startTime ? new Date(row.startTime) : null;
      const endTime = row.endTime ? new Date(row.endTime) : null;
      const statusStr = String(row.status || "SCHEDULED").trim().toUpperCase();

      if (!startTime || isNaN(startTime.getTime())) {
        report.errors.push({ index: i + 1, row, message: "Valid 'startTime' is required (ISO 8601 format)", field: "startTime" });
        report.failed++;
        continue;
      }
      if (!endTime || isNaN(endTime.getTime())) {
        report.errors.push({ index: i + 1, row, message: "Valid 'endTime' is required (ISO 8601 format)", field: "endTime" });
        report.failed++;
        continue;
      }
      if (startTime.getTime() >= endTime.getTime()) {
        report.errors.push({ index: i + 1, row, message: "'startTime' must be before 'endTime'", field: "startTime" });
        report.failed++;
        continue;
      }

      // Resolve Theatre
      if (!theatreId && theatreCode) {
        const t = await prisma.theatre.findUnique({ where: { code: theatreCode } });
        if (!t) {
          report.errors.push({ index: i + 1, row, message: `Theatre code '${theatreCode}' not found`, field: "theatreCode" });
          report.failed++;
          continue;
        }
        theatreId = t.id;
      }
      if (!theatreId) {
        report.errors.push({ index: i + 1, row, message: "Either 'theatreId' or 'theatreCode' is required", field: "theatreId" });
        report.failed++;
        continue;
      }

      // Resolve Screen
      if (!screenId && screenNumber && theatreId) {
        const s = await prisma.screen.findUnique({
          where: { theatreId_screenNumber: { theatreId, screenNumber } },
        });
        if (!s) {
          report.errors.push({ index: i + 1, row, message: `Screen number ${screenNumber} not found for theatre`, field: "screenNumber" });
          report.failed++;
          continue;
        }
        screenId = s.id;
      }
      if (!screenId) {
        report.errors.push({ index: i + 1, row, message: "Either 'screenId' or 'screenNumber' is required", field: "screenId" });
        report.failed++;
        continue;
      }

      // Resolve Movie
      if (!movieId && movieTitle) {
        const m = await prisma.movie.findFirst({ where: { title: movieTitle } });
        if (!m) {
          report.errors.push({ index: i + 1, row, message: `Movie title '${movieTitle}' not found`, field: "movieTitle" });
          report.failed++;
          continue;
        }
        movieId = m.id;
      }
      if (!movieId) {
        report.errors.push({ index: i + 1, row, message: "Either 'movieId' or 'movieTitle' is required", field: "movieId" });
        report.failed++;
        continue;
      }

      // Check duplicate show in screen and overlapping time
      const existing = await prisma.show.findFirst({
        where: { theatreId, screenId, startTime },
      });
      if (existing) {
        if (skipDuplicates) {
          report.skipped++;
          continue;
        } else {
          report.errors.push({ index: i + 1, row, message: `Show at this screen and startTime already exists`, field: "startTime" });
          report.failed++;
          continue;
        }
      }

      validRows.push({
        theatreId,
        screenId,
        movieId,
        startTime,
        endTime,
        status: (statusStr as ShowStatus) || "SCHEDULED",
      });
    }

    if (!dryRun && validRows.length > 0 && report.failed === 0) {
      await prisma.$transaction(async (tx) => {
        for (const r of validRows) {
          await tx.show.create({ data: r });
          report.inserted++;
        }
      });
    } else if (dryRun) {
      report.inserted = validRows.length;
    }
  }

  // ============================================================================
  // 8. TICKETS
  // ============================================================================
  private async importTickets(
    records: Record<string, any>[],
    report: ImportReport,
    dryRun: boolean,
    skipDuplicates: boolean
  ): Promise<void> {
    const validRows: any[] = [];
    const seenSeats = new Set<string>();

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      let showId = row.showId ? String(row.showId).trim() : null;
      const seatNumber = String(row.seatNumber || "").trim().toUpperCase();
      const price = row.price ? parseFloat(row.price) : 15.0;
      let ticketNumber = row.ticketNumber ? String(row.ticketNumber).trim().toUpperCase() : null;
      const statusStr = String(row.status || "ISSUED").trim().toUpperCase();
      const createActivation = row.createActivation === true || String(row.createActivation).toLowerCase() === "true" || row.createActivation === undefined;

      if (!seatNumber) {
        report.errors.push({ index: i + 1, row, message: "Field 'seatNumber' is required", field: "seatNumber" });
        report.failed++;
        continue;
      }
      if (isNaN(price) || price < 0) {
        report.errors.push({ index: i + 1, row, message: "Field 'price' must be a valid positive number", field: "price" });
        report.failed++;
        continue;
      }

      if (!showId) {
        report.errors.push({ index: i + 1, row, message: "Field 'showId' is required", field: "showId" });
        report.failed++;
        continue;
      }

      // Verify Show exists
      const show = await prisma.show.findUnique({ where: { id: showId } });
      if (!show) {
        report.errors.push({ index: i + 1, row, message: `Referenced showId '${showId}' not found`, field: "showId" });
        report.failed++;
        continue;
      }

      const seatKey = `${showId}:${seatNumber}`;
      if (seenSeats.has(seatKey)) {
        report.errors.push({ index: i + 1, row, message: `Duplicate seat '${seatNumber}' for show in batch`, field: "seatNumber" });
        report.failed++;
        continue;
      }
      seenSeats.add(seatKey);

      // Check DB duplicate
      const existingSeat = await prisma.ticket.findFirst({
        where: { showId, seatNumber, status: { not: "CANCELLED" } },
      });
      if (existingSeat) {
        if (skipDuplicates) {
          report.skipped++;
          continue;
        } else {
          report.errors.push({ index: i + 1, row, message: `Seat '${seatNumber}' is already issued for this show`, field: "seatNumber" });
          report.failed++;
          continue;
        }
      }

      if (!ticketNumber) {
        ticketNumber = `TCK-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      } else {
        const existingNum = await prisma.ticket.findUnique({ where: { ticketNumber } });
        if (existingNum) {
          report.errors.push({ index: i + 1, row, message: `Ticket number '${ticketNumber}' already exists in database`, field: "ticketNumber" });
          report.failed++;
          continue;
        }
      }

      validRows.push({
        showId,
        ticketNumber,
        seatNumber,
        price,
        status: (statusStr as TicketStatus) || "ISSUED",
        createActivation,
      });
    }

    if (!dryRun && validRows.length > 0 && report.failed === 0) {
      await prisma.$transaction(async (tx) => {
        for (const r of validRows) {
          const { createActivation, ...ticketData } = r;
          const activationToken = crypto.randomBytes(24).toString("hex");

          await tx.ticket.create({
            data: {
              ...ticketData,
              activation: createActivation
                ? {
                    create: {
                      activationCode: activationToken,
                      status: "PENDING",
                    },
                  }
                : undefined,
            },
          });
          report.inserted++;
        }
      });
    } else if (dryRun) {
      report.inserted = validRows.length;
    }
  }
}

export const dataImportService = DataImportService.getInstance();
