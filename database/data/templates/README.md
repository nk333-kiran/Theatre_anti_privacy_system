# Real-Data Import Framework & Schema Guidelines

This directory contains standardized templates (in both **CSV** and **JSON** formats) for safely importing real production records into the Theatre Anti-Piracy Platform.

---

## 🔒 Import Safety Guarantees

1. **Transaction Isolation (`prisma.$transaction`)**: All batch insertions are atomic. If any non-recoverable error occurs in commit mode, the entire transaction rolls back cleanly, leaving zero partial data.
2. **Duplicate Prevention**: Unique constraints across codes, emails, seat bookings, and ticket numbers are validated prior to execution.
3. **Foreign Key Integrity**: Relational dependencies (e.g. `Show` -> `Theatre` / `Screen` / `Movie`) are verified against live PostgreSQL records.
4. **Dry-Run Validation Mode**: You can test and validate any data file without altering database state.
5. **No Data Overwrite**: Existing database records and security audit trails are preserved.

---

## 📋 Logical Entity Import Sequence

To satisfy foreign key relationships, import real data in the following order:

```text
1. Production Companies  (production_companies_template.csv / .json)
2. Theatres              (theatres_template.csv / .json)
3. Screens               (screens_template.csv / .json)
4. Users / Staff         (users_template.csv / .json)
5. Movies                (movies_template.csv / .json)
6. Movie Releases        (movie_releases_template.csv / .json)
7. Shows / Sessions      (shows_template.csv / .json)
8. Tickets               (tickets_template.csv / .json)
```

---

## 🛠️ Methods to Import Real Data

### Method 1: Using the CLI Tool (Recommended for Large Batches)

```powershell
# 1. Validate without inserting (Dry Run)
node scripts/import_data_cli.js --file ./database/data/templates/theatres_template.csv --entity theatres --dry-run

# 2. Commit validated records into PostgreSQL
node scripts/import_data_cli.js --file ./database/data/templates/theatres_template.csv --entity theatres --commit
```

### Method 2: Using the REST API

Authenticated endpoint: `POST /api/data-import/validate` and `POST /api/data-import/commit`
Headers: `Authorization: Bearer <ADMIN_JWT_TOKEN>`, `Content-Type: application/json`

Payload example:
```json
{
  "entityType": "theatres",
  "data": "name,code,location\n\"Cinema One\",\"C1\",\"Dallas, TX\"",
  "skipDuplicates": true
}
```

---

## 📑 Entity Field Reference

### 1. Production Companies (`production-companies`)
| Field | Type | Required | Description |
|---|---|---|---|
| `name` | String | Yes | Production studio name (e.g. `Universal Pictures`) |
| `code` | String | Yes | Unique alphanumeric code (e.g. `UNI`) |
| `contactEmail` | String | Yes | Security / Operations contact email |
| `contactPhone` | String | No | Telephone contact |
| `status` | String | No | Default `ACTIVE` |

### 2. Theatres (`theatres`)
| Field | Type | Required | Description |
|---|---|---|---|
| `name` | String | Yes | Theatre name (e.g. `Regal LA Live`) |
| `code` | String | Yes | Unique identifier (e.g. `RLL-01`) |
| `location` | String | Yes | City, State or District |
| `address` | String | No | Full street address |
| `contactEmail` | String | No | Venue contact email |
| `contactPhone` | String | No | Venue phone number |
| `permanentQrCode` | String | No | Unique lobby/seat QR token (auto-generated if empty) |

### 3. Screens (`screens`)
| Field | Type | Required | Description |
|---|---|---|---|
| `theatreCode` | String | Yes (or `theatreId`) | Matching Theatre code |
| `screenNumber` | Integer | Yes | Unique screen index in theatre (e.g. `1`, `2`) |
| `name` | String | No | Screen name (e.g. `IMAX Auditorium 1`) |
| `capacity` | Integer | Yes | Total seat count (e.g. `350`) |

### 4. Users (`users`)
| Field | Type | Required | Description |
|---|---|---|---|
| `email` | String | Yes | Unique login email |
| `name` | String | Yes | Full name |
| `role` | Enum | Yes | `ADMIN`, `THEATRE_ADMIN`, `THEATRE_STAFF`, `PRODUCTION_COMPANY` |
| `theatreCode` | String | No | Associated theatre code (for staff/theatre admins) |
| `productionCompanyCode` | String | No | Associated studio code (for studio reps) |
| `password` | String | No | Initial plain text password |

### 5. Movies (`movies`)
| Field | Type | Required | Description |
|---|---|---|---|
| `title` | String | Yes | Movie title |
| `durationMinutes` | Integer | Yes | Running time in minutes (e.g. `150`) |
| `language` | String | No | Audio language (default `English`) |
| `rating` | String | No | Age rating (`PG-13`, `R`, etc.) |
| `synopsis` | String | No | Plot synopsis |
| `description` | String | No | Theatrical distribution notes |
| `releaseDate` | Date | No | Release date (`YYYY-MM-DD`) |
| `productionCompanyCode` | String | No | Owner studio code |

### 6. Movie Releases (`movie-releases`)
| Field | Type | Required | Description |
|---|---|---|---|
| `movieTitle` | String | Yes (or `movieId`) | Movie title |
| `theatreCode` | String | Yes (or `theatreId`) | Exhibition Theatre code |
| `startDate` | ISO Date | Yes | Start of theatrical release (`YYYY-MM-DDTHH:mm:ssZ`) |
| `endDate` | ISO Date | Yes | End of theatrical release (`YYYY-MM-DDTHH:mm:ssZ`) |
| `productionCompanyCode` | String | No | Studio code |
| `status` | Enum | No | `ACTIVE`, `PENDING_APPROVAL`, `COMPLETED` |

### 7. Shows (`shows`)
| Field | Type | Required | Description |
|---|---|---|---|
| `theatreCode` | String | Yes | Venue code |
| `screenNumber` | Integer | Yes | Auditorium number in the theatre |
| `movieTitle` | String | Yes | Feature film title |
| `startTime` | ISO Date | Yes | Showtime start (`YYYY-MM-DDTHH:mm:ssZ`) |
| `endTime` | ISO Date | Yes | Showtime conclusion (`YYYY-MM-DDTHH:mm:ssZ`) |
| `status` | Enum | No | `SCHEDULED`, `ACTIVE`, `COMPLETED`, `CANCELLED` |

### 8. Tickets (`tickets`)
| Field | Type | Required | Description |
|---|---|---|---|
| `showId` | UUID | Yes | Target screening session UUID |
| `seatNumber` | String | Yes | Seat code (e.g. `A1`, `F12`) |
| `price` | Decimal | No | Ticket price (default `15.00`) |
| `ticketNumber` | String | No | Custom ticket number (auto-generated if blank) |
| `createActivation` | Boolean | No | Whether to create pending QR token (default `true`) |
