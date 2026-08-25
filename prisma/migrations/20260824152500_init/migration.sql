-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "IngestStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "current" BOOLEAN NOT NULL DEFAULT false,
    "broadcast_uuid" TEXT,
    "results_uuid" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "acronym" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "broadcast_uuid" TEXT,
    "results_uuid" TEXT,
    "riders_uuid" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "shortname" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "source_name" TEXT NOT NULL,
    "additional_name" TEXT,
    "country_iso" TEXT NOT NULL,
    "circuit_name" TEXT NOT NULL,
    "circuit_city" TEXT,
    "circuit_time_zone" TEXT NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "status" TEXT NOT NULL,
    "has_results" BOOLEAN NOT NULL DEFAULT false,
    "background_url" TEXT,
    "flag_url" TEXT,
    "track_svg_url" TEXT,
    "track_png_url" TEXT,
    "broadcast_uuid" TEXT NOT NULL,
    "results_uuid" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "shortname" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3),
    "status" TEXT NOT NULL,
    "gp_day" INTEGER,
    "broadcast_uuid" TEXT NOT NULL,
    "results_uuid" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "riders" (
    "id" TEXT NOT NULL,
    "riders_api_uuid" TEXT NOT NULL,
    "results_rider_uuid" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "number" INTEGER,
    "short_name" TEXT,
    "country_iso" TEXT NOT NULL,
    "country_name" TEXT,
    "flag_url" TEXT,
    "category_id" TEXT,
    "team_name" TEXT,
    "team_color" TEXT,
    "team_picture_url" TEXT,
    "constructor_name" TEXT,
    "profile_picture_url" TEXT,
    "portrait_url" TEXT,
    "number_picture_url" TEXT,
    "helmet_url" TEXT,
    "bike_url" TEXT,
    "career_season" INTEGER,
    "in_grid" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "riders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standing_entries" (
    "id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "rider_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "team_name" TEXT,
    "constructor_name" TEXT,
    "race_wins" INTEGER NOT NULL DEFAULT 0,
    "podiums" INTEGER NOT NULL DEFAULT 0,
    "sprint_wins" INTEGER NOT NULL DEFAULT 0,
    "sprint_podiums" INTEGER NOT NULL DEFAULT 0,
    "position_change" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "standing_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_results" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "rider_id" TEXT NOT NULL,
    "position" INTEGER,
    "points" INTEGER NOT NULL DEFAULT 0,
    "team_name" TEXT,
    "constructor_name" TEXT,
    "time" TEXT,
    "gap_to_first" TEXT,
    "total_laps" INTEGER,
    "average_speed" DOUBLE PRECISION,
    "status" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "session_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingest_runs" (
    "id" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "status" "IngestStatus" NOT NULL DEFAULT 'RUNNING',
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(3),
    "duration_ms" INTEGER,
    "records_read" INTEGER NOT NULL DEFAULT 0,
    "records_upserted" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "ingest_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seasons_year_key" ON "seasons"("year");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_broadcast_uuid_key" ON "seasons"("broadcast_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_results_uuid_key" ON "seasons"("results_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "categories_acronym_key" ON "categories"("acronym");

-- CreateIndex
CREATE UNIQUE INDEX "categories_broadcast_uuid_key" ON "categories"("broadcast_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "categories_results_uuid_key" ON "categories"("results_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "categories_riders_uuid_key" ON "categories"("riders_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "events_broadcast_uuid_key" ON "events"("broadcast_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "events_results_uuid_key" ON "events"("results_uuid");

-- CreateIndex
CREATE INDEX "events_season_id_round_idx" ON "events"("season_id", "round");

-- CreateIndex
CREATE INDEX "events_starts_at_idx" ON "events"("starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "events_season_id_shortname_key" ON "events"("season_id", "shortname");

-- CreateIndex
CREATE UNIQUE INDEX "events_season_id_slug_key" ON "events"("season_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "events_season_id_round_key" ON "events"("season_id", "round");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_broadcast_uuid_key" ON "sessions"("broadcast_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_results_uuid_key" ON "sessions"("results_uuid");

-- CreateIndex
CREATE INDEX "sessions_event_id_category_id_starts_at_idx" ON "sessions"("event_id", "category_id", "starts_at");

-- CreateIndex
CREATE INDEX "sessions_starts_at_idx" ON "sessions"("starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "riders_riders_api_uuid_key" ON "riders"("riders_api_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "riders_results_rider_uuid_key" ON "riders"("results_rider_uuid");

-- CreateIndex
CREATE INDEX "riders_category_id_in_grid_idx" ON "riders"("category_id", "in_grid");

-- CreateIndex
CREATE INDEX "standing_entries_season_id_category_id_position_idx" ON "standing_entries"("season_id", "category_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "standing_entries_season_id_category_id_rider_id_key" ON "standing_entries"("season_id", "category_id", "rider_id");

-- CreateIndex
CREATE INDEX "session_results_session_id_position_idx" ON "session_results"("session_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "session_results_session_id_rider_id_key" ON "session_results"("session_id", "rider_id");

-- CreateIndex
CREATE INDEX "ingest_runs_task_started_at_idx" ON "ingest_runs"("task", "started_at");

-- CreateIndex
CREATE INDEX "ingest_runs_status_started_at_idx" ON "ingest_runs"("status", "started_at");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riders" ADD CONSTRAINT "riders_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standing_entries" ADD CONSTRAINT "standing_entries_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standing_entries" ADD CONSTRAINT "standing_entries_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standing_entries" ADD CONSTRAINT "standing_entries_rider_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "riders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_results" ADD CONSTRAINT "session_results_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_results" ADD CONSTRAINT "session_results_rider_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "riders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

